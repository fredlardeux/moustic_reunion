const fs = require("fs");
const fetch = global.fetch || require("node-fetch");

async function getGitHubData(repo) {

    const url = `https://api.github.com/repos/${repo}/releases`;
    const res = await fetch(url);
    const releases = await res.json();

    let totalDownloads = 0;
    let latestVersion = null;

    if (releases.length > 0) {
        latestVersion = releases[0].tag_name; // version la plus récente
    }

    releases.forEach(r => {
        (r.assets || []).forEach(a => {
            totalDownloads += a.download_count || 0;
        });
    });

    return {
        github_downloads: totalDownloads,
        github_version: latestVersion
    };
}



async function fetchZenodo(recordId) {

    if (!recordId) return { downloads: 0 };

    const url = `https://zenodo.org/api/records/${recordId}`;
    const res = await fetch(url);

    if (!res.ok) {
        return { downloads: 0 };
    }

    const data = await res.json();

    return {
        downloads: data.stats?.downloads || 0
    };
}




async function main() {
    const tools = JSON.parse(fs.readFileSync("data/tools.json"));

    const stats = {};

    for (const t of tools) {
        const gh = await getGitHubData(t.github_repo);
        const zn = await fetchZenodo(t.zenodo_id);

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

    console.log("Stats updated");
}




main();