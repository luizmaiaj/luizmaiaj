import { Octokit } from "@octokit/core";
import fs from 'fs';

const octokit = new Octokit({ auth: process.env.PERSONAL_ACCESS_TOKEN });

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

async function updateReadme(languageData) {
  let readme = fs.readFileSync('README.md', 'utf8');

  let languageStats = '### 💻 Most Used Languages\n\n';
  for (const [language, bytes] of Object.entries(languageData)) {
    languageStats += `- ${language}: ${bytes} bytes\n`;
  }

  readme = readme.replace(/### 💻 Most Used Languages[\s\S]*### 📫 How to Reach Me/, languageStats);
  fs.writeFileSync('README.md', readme);

  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: 'luizmaiaj',
    repo: 'luizmaiaj',
    path: 'README.md',
    message: 'Update README with language stats',
    content: Buffer.from(readme).toString('base64'),
    branch: 'main'
  });
}

getLanguages().then(updateReadme).catch(error => console.error(error));
