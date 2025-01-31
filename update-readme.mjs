import { Octokit } from "@octokit/core";
import fetch from 'node-fetch';
import fs from 'fs';

const octokit = new Octokit({
  auth: process.env.PERSONAL_ACCESS_TOKEN,
  request: {
    fetch
  }
});

// Language badge mapping (simplified for example)
const LANGUAGE_BADGES = {
  "Python": "![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)",
  "JavaScript": "![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)",
  "Swift": "![Swift](https://img.shields.io/badge/swift-F54A2A?style=for-the-badge&logo=swift&logoColor=white)",
  "HTML": "![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)",
  "CSS": "![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)",
  "Shell": "![Shell Script](https://img.shields.io/badge/shell_script-%23121011.svg?style=for-the-badge&logo=gnu-bash&logoColor=white)",
  "Dockerfile": "![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)",
  "Jupyter Notebook": "![Jupyter Notebook](https://img.shields.io/badge/jupyter-%23FA0F00.svg?style=for-the-badge&logo=jupyter&logoColor=white)",
  "C#": "![C#](https://img.shields.io/badge/c%23-%23239120.svg?style=for-the-badge&logo=csharp&logoColor=white)",
  "Lua": "![Lua](https://img.shields.io/badge/lua-%232C2D72.svg?style=for-the-badge&logo=lua&logoColor=white)",
  "C++": "![C++](https://img.shields.io/badge/c++-%2300599C.svg?style=for-the-badge&logo=c%2B%2B&logoColor=white)",
  "C": "![C](https://img.shields.io/badge/c-%2300599C.svg?style=for-the-badge&logo=c&logoColor=white)",
  "CMake": "![CMake](https://img.shields.io/badge/CMake-%23008FBA.svg?style=for-the-badge&logo=cmake&logoColor=white)"
};

async function getLanguages() {
  const repos = await octokit.request('GET /user/repos', {
    type: 'all',
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

  // Generate badges section
  const badges = Object.keys(languageData)
    .sort((a, b) => languageData[b] - languageData[a])
    .map(lang => LANGUAGE_BADGES[lang] || '')
    .filter(Boolean)
    .join(' ');

  // Crete new content
  const newContent = `<!-- START LANGUAGE STATS -->
## 🚀 Language Statistics

${badges}

| Language | Percentage | Bytes |
|----------|------------|-------|
${Object.entries(languageData)
  .sort((a, b) => b[1] - a[1])
  .map(([lang, bytes]) => {
    const percent = ((bytes / Object.values(languageData).reduce((a, b) => a + b, 0)) * 100).toFixed(2);
    return `| ${lang} | ${percent}% | ${bytes.toLocaleString()} |`;
  }).join('\n')}

</details>
<!-- END LANGUAGE STATS -->`;

  // Replace the content
  readme = readme.replace(/<!-- START LANGUAGE STATS -->[\s\S]*<!-- END LANGUAGE STATS -->/, newContent);

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
