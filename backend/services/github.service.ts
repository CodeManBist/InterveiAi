import axios from "axios";

const getUserRepositories = async (username: string) => {
  const response = await axios.get(
    `https://api.github.com/users/${username}/repos`
  );

  return response.data.map((repo: any) => ({
    name: repo.name,
    description: repo.description,
    language: repo.language,
    topics: repo.topics,
    stars: repo.stargazers_count,
    url: repo.html_url,
  }));
};

export default getUserRepositories;