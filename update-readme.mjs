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

async function updateReadme(languageData) {
  let readme = fs.readFileSync('README.md', 'utf8');
  console.log('Original README content:', readme);

  let languageStats = '### 💻 Most Used Languages\n\n';
  for (const [language, bytes] of Object.entries(languageData)) {
    languageStats += `- ${language}: ${bytes} bytes\n`;
  }

  console.log(languageStats)

  // Ensure the placeholder is correctly identified and replaced
  const placeholder = '<!-- Language stats will be inserted here -->';
  if (readme.includes(placeholder)) {
    readme = readme.replace(placeholder, languageStats);
  } else {
    // If the placeholder is not found, append the language stats at the end
    readme += `\n${languageStats}`;
  }

  console.log('Updated README content:', readme);

  // Fetch the current SHA of the README.md file
  const { data: { sha } } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: 'luizmaiaj',
    repo: 'luizmaiaj',
    path: 'README.md'
  });
  console.log('Current SHA:', sha);

  const updateResponse = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: 'luizmaiaj',
    repo: 'luizmaiaj',
    path: 'README.md',
    message: 'Update README with language stats',
    content: Buffer.from(readme).toString('base64'),
    sha: sha,
    branch: 'main'
  });

  console.log('Update response:', updateResponse);
}

getLanguages().then(updateReadme).catch(error => console.error(error));
