import { SearchResult } from "../lib/processSearchResults";

export class SearchTool {
  name: string;
  private apiKey: string;

  constructor(name: string) {
    this.name = name;
    this.apiKey = process.env.BRAVE_API_KEY!;
  }

  async search(
    query: string,
    params: Record<string, any> = {}
  ): Promise<SearchResult[] | null> {
    try {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.search = new URLSearchParams({ q: query, ...params }).toString();

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return (data.web?.results as SearchResult[]) || null;
    } catch (error) {
      console.error("Error in search method:", error);
      return null;
    }
  }
}
