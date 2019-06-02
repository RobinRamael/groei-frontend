async function getContent(sha) {
  const contentResponse = await fetch(
    `http://localhost:8000/versions/hethaltingprobleem/${sha}/`
  );

  if (!contentResponse.ok) {
    throw contentResponse;
  }
  const contentJson = await contentResponse.json();
  // const content = window.atob(contentJson.content);
  return contentJson.content;
}

