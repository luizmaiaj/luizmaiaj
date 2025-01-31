import { Octokit } from "@octokit/core";
import fetch from 'node-fetch';
import fs from 'fs';

const octokit = new Octokit({
  auth: process.env.PERSONAL_ACCESS_TOKEN,
  request: {
    fetch
  }
});

async function getLanguages() {
  const repos = await octokit.request('GET /user/repos', {
    type: 'private',
    per_page: 100
  });

  let languageData = {};
  for (const repo of repos.data) {
    const languages = await octokit.request(`GET /repos/${repo.full_name}/languages`);
    for (const [language, bytes] of Object.entries(languages.data)) {
      if (!languageData[language]) {
        languageData[language] = 0;
      }
      languageData[language] += bytes;
    }
  }
  return languageData;
}

function generateChartUrl(languageData) {
  const labels = Object.keys(languageData);
  const data = Object.values(languageData);
  const total = data.reduce((sum, val) => sum + val, 0);
  const percentages = data.map(bytes => ((bytes / total) * 100).toFixed(2));

  return `https://quickchart.io/chart?c={
    type: 'pie',
    data: {
      labels: ${JSON.stringify(labels)},
      datasets: [{
        data: ${JSON.stringify(percentages)},
        backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40']
      }]
    },
    options: {
      title: { display: true, text: 'Language Usage' },
      animation: { animateRotate: true }
    }
  }`;
}

function generateProgressBars(languageData) {
  const total = Object.values(languageData).reduce((sum, val) => sum + val, 0);
  return Object.entries(languageData)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, bytes]) => {
      const percent = ((bytes / total) * 100).toFixed(2);
      return `
**${lang}**  
\`\`\`text
${'█'.repeat((percent / 2))} ${percent}%
\`\`\`
      `;
    }).join('\n');
}

async function updateReadme(languageData) {
  let readme = fs.readFileSync('README.md', 'utf8');
  const chartUrl = generateChartUrl(languageData);
  const progressBars = generateProgressBars(languageData);

  let languageStats = '### 💻 Most Used Languages\n\n';
  for (const [language, bytes] of Object.entries(languageData)) {
    languageStats += `- ${language}: ${bytes} bytes\n`;
  }

  // Crete new content
  const newContent = `
<!-- START LANGUAGE STATS -->
## 🚀 Language Statistics

### 📊 Animated Pie Chart
![Language Chart](${chartUrl})

### 📈 Language Distribution
${progressBars}

<details>
<summary>📋 Raw Data</summary>

| Language | Percentage | Bytes |
|----------|------------|-------|
${Object.entries(languageData)
  .sort((a, b) => b[1] - a[1])
  .map(([lang, bytes]) => {
    const percent = ((bytes / Object.values(languageData).reduce((a, b) => a + b, 0)) * 100).toFixed(2);
    return `| ${lang} | ${percent}% | ${bytes.toLocaleString()} |`;
  }).join('\n')}

</details>
<!-- END LANGUAGE STATS -->
  `;

  // Replace the content
  // readme = readme.replace(new RegExp(`${startMarker}[\\s\\S]*${endMarker}`), newContent);
  readme = readme.replace(/<!-- START LANGUAGE STATS -->[\s\S]*<!-- END LANGUAGE STATS -->/, newContent);

  // fs.writeFileSync('README.md', readme);
  
  console.log('Updated README content:', readme);

  // Fetch the current SHA of the README.md file
  const { data: { sha } } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: 'luizmaiaj',
    repo: 'luizmaiaj',
    path: 'README.md'
  });

  const updateResponse = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: 'luizmaiaj',
    repo: 'luizmaiaj',
    path: 'README.md',
    message: 'Update README with language stats',
    content: Buffer.from(readme).toString('base64'),
    sha: sha,
    branch: 'main'
  });
}

getLanguages().then(updateReadme).catch(error => console.error(error));
