import { NextRequest, NextResponse } from "next/server";

interface GitHubFile {
  path: string;
  content: string;
  mode?: string;
  type?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { token, owner, repo, files, commitMessage, branch = "main" } = await req.json();

    if (!token || !owner || !repo || !files || !commitMessage) {
      return NextResponse.json(
        { error: "Missing required fields: token, owner, repo, files, commitMessage" },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "TheAgency-AI",
    };

    // Step 1: Get the latest commit SHA on the branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      { headers }
    );

    if (!refResponse.ok) {
      const err = await refResponse.json();
      return NextResponse.json(
        { error: `Failed to get branch ref: ${err.message || "Unknown error"}` },
        { status: 400 }
      );
    }

    const refData = await refResponse.json();
    const latestCommitSha = refData.object.sha;

    // Step 2: Get the commit to find its tree SHA
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      { headers }
    );

    if (!commitResponse.ok) {
      return NextResponse.json(
        { error: "Failed to get latest commit" },
        { status: 400 }
      );
    }

    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // Step 3: Create blobs for each file
    const blobs = [];
    for (const file of files as GitHubFile[]) {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: file.content,
            encoding: "utf-8",
          }),
        }
      );

      if (!blobResponse.ok) {
        const err = await blobResponse.json();
        return NextResponse.json(
          { error: `Failed to create blob for ${file.path}: ${err.message || "Unknown error"}` },
          { status: 400 }
        );
      }

      const blobData = await blobResponse.json();
      blobs.push({
        path: file.path,
        mode: file.mode || "100644",
        type: file.type || "blob",
        sha: blobData.sha,
      });
    }

    // Step 4: Create a new tree with the blobs
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: blobs,
        }),
      }
    );

    if (!treeResponse.ok) {
      const err = await treeResponse.json();
      return NextResponse.json(
        { error: `Failed to create tree: ${err.message || "Unknown error"}` },
        { status: 400 }
      );
    }

    const treeData = await treeResponse.json();

    // Step 5: Create a new commit
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: commitMessage,
          tree: treeData.sha,
          parent: latestCommitSha,
        }),
      }
    );

    if (!newCommitResponse.ok) {
      const err = await newCommitResponse.json();
      return NextResponse.json(
        { error: `Failed to create commit: ${err.message || "Unknown error"}` },
        { status: 400 }
      );
    }

    const newCommitData = await newCommitResponse.json();

    // Step 6: Update the branch reference
    const updateRefResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          sha: newCommitData.sha,
        }),
      }
    );

    if (!updateRefResponse.ok) {
      const err = await updateRefResponse.json();
      return NextResponse.json(
        { error: `Failed to update branch: ${err.message || "Unknown error"}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      commitSha: newCommitData.sha,
      commitUrl: newCommitData.html_url,
      message: `Successfully pushed ${files.length} file(s) to ${owner}/${repo} on branch ${branch}`,
    });
  } catch (error: unknown) {
    console.error("GitHub push error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
