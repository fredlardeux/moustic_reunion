const fs = require("fs");
const fetch = global.fetch || require("node-fetch");

/* =========================
   GITHUB DATA
========================= */
async function getGitHubData(repo) {

    try {
        // 👉 1. récupérer la dernière release
        const url = `https://api.github.com/repos/${repo}/releases/latest`;

        const res = await fetch(url, {
            headers: {
                "Accept": "application/vnd.github+json"
            }
        });

        const release = await res.json();

        // 👉 cas erreur GitHub
        if (release.message === "Not Found") {
            console.log(`⚠️ No release found for ${repo}, fallback to tags`);

            return await getGitHubTags(repo);
        }

        let totalDownloads = 0;

        (release.assets || []).forEach(a => {
            totalDownloads += a.download_count || 0;
        });

        return {
            github_downloads: totalDownloads,
            github_version: release.tag_name || null
        };

    } catch (err) {
        console.log("GitHub error:", err);
        return {
            github_downloads: 0,
            github_version: null
        };
    }
}


/* =========================
   FALLBACK TAGS
========================= */
async function getGitHubTags(repo) {

    try {
        const url = `https://api.github.com/repos/${repo}/tags`;
        const res = await fetch(url);
        const tags = await res.json();

        const version = tags?.[0]?.name || null;

        return {
            github_downloads: 0,
            github_version: version
        };

    } catch (err) {
        return {
            github_downloads: 0,
            github_version: null
        };
    }
}


/* =========================
   ZENODO DATA
========================= */
async function fetchZenodo(recordId) {

    try {
        if (!recordId) return { downloads: 0 };

        const url = `https://zenodo.org/api/records/${recordId}`;
        const res = await fetch(url);

        if (!res.ok) {
            console.log(`⚠️ Zenodo error for ${recordId}`);
            return { downloads: 0 };
        }

        const data = await res.json();

        return {
            downloads: data.stats?.downloads ?? 0
        };

    } catch (err) {
        console.log("Zenodo error:", err);
        return { downloads: 0 };
    }
}


/* =========================
   MAIN
========================= */
async function main() {

    const tools = JSON.parse(fs.readFileSync("data/tools.json"));
    const stats = {};

    for (const t of tools) {

        console.log(`Processing ${t.id}...`);

        const gh = await getGitHubData(t.github_repo);
        const zn = await fetchZenodo(t.zenodo_record);

        stats[t.id] = {
            github_downloads: gh.github_downloads,
            github_version: gh.github_version,
            zenodo_downloads: zn.downloads,
            total_downloads: gh.github_downloads + zn.downloads,
            updated_at: new Date().toISOString()
        };
    }

    fs.writeFileSync(
        "data/stats.json",
        JSON.stringify(stats, null, 2)
    );

    console.log("✅ Stats updated");
}

main();
