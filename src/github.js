async function getContent(sha) {
  const contentResponse = await fetch(
    process.env.PUBLIC_URL + `/versions/hethaltingprobleem/${sha}.json`
  );

  if (!contentResponse.ok) {
    throw contentResponse;
  }
  const contentJson = await contentResponse.json();
  // const content = window.atob(contentJson.content);
  return contentJson.content;
}

