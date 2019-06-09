import { getLanguage, getLanguageDependencies } from "./language-detector";

// const [repo, sha, path] = getParams();
// const lang = getLanguage(path);
const root = document.getElementById("root");
const message = document.getElementById("message");

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

class History {
  constructor(commits, pageSize = 100, bound = 30) {
    this.commits = commits;
    this.pageSize = pageSize;
    this.bound = bound;

    this.pages = [null, null, null];
    this.currLoading = this.ensurePageLoaded(1, 0, pageSize).then(() => {
      this.lo = 0;
      this.hi = pageSize;
      this.currLoading = null;
    });
  }

  ensurePageLoaded(pageNo, lo, hi) {
    this.pages[pageNo] = {};
    return Promise.all(
      this.commits.slice(lo, hi).map(async commit => {
        const content = await getContent(commit.sha);
        this.pages[pageNo][commit.sha] = content;
      })
    );
  }

  possiblyPreparePages(idx) {
    if (this.currLoading == null) {
      if (idx <= this.lo + this.bound && this.lo > 0 && this.pages[0] == null) {
        this.currLoading = this.ensurePageLoaded(
          0,
          this.lo - this.pageSize,
          this.hi - this.pageSize
        ).then(() => {
          this.currLoading = null;
        });
      } else if (
        this.hi - this.bound <= idx &&
        this.hi < this.commits.length &&
        this.pages[2] == null
      ) {
        this.currLoading = this.ensurePageLoaded(
          2,
          this.lo + this.pageSize,
          this.hi + this.pageSize
        ).then(() => {
          this.currLoading = null;
        });
      }
    }
  }

  getCommit(idx) {
    this.possiblyPreparePages(idx);

    if (idx < this.lo) {
      this.pages[2] = this.pages[1];
      this.pages[1] = this.pages[0];
      this.pages[0] = null;
      this.lo = this.lo - this.pageSize;
      this.hi = this.hi - this.pageSize;
    } else if (idx > 0 && idx >= this.hi) {
      this.pages[0] = this.pages[1];
      this.pages[1] = this.pages[2];
      this.pages[2] = null;
      this.lo = this.lo + this.pageSize;
      this.hi = this.hi + this.pageSize;
    }

    return this.pages[1][this.commits[idx].sha];
  }

  get length() {
    return this.commits.length;
  }
}

async function getHistory() {
  const commitsResponse = await fetch(
    process.env.PUBLIC_URL + "/versions/hethaltingprobleem.json"
  );
  if (!commitsResponse.ok) {
    throw commitsResponse;
  }
  const commitsJson = await commitsResponse.json();
  const commits = commitsJson.history
    .slice(50)
    .map(commit => ({
      sha: commit.hex,
      date: new Date(commit.created)
    }))
    .sort(function(a, b) {
      return a.date - b.date;
    });

  // await Promise.all(
  //   commits.map(async commit => {
  //     const content = await getContent(commit.sha);
  //     commit.content = content;
  //   })
  // );

  return new History(commits);
}

Promise.all([
  getHistory(),
  import("./app")
  // loadLanguage(lang)
])
  .then(([history, app]) => {
    app.render(history, root);
  })
  .catch(error => {
    console.error(error);
    message.innerHTML = `<p>Unexpected error. Check the console.</p>`;
  });
