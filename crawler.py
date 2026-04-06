import asyncio
import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from collections import deque

START_URL = "https://www.uc.edu/"
MAX_PAGES = 999
CONCURRENT_REQUESTS = 10

visited = set()
queue = deque([START_URL])


async def fetch(session, url):
    try:
        async with session.get(url, timeout=10) as response:
            if "text/html" in response.headers.get("Content-Type", ""):
                return await response.text()
    except Exception:
        return None


async def worker(session, domain):
    while queue and len(visited) < MAX_PAGES:
        url = queue.popleft()

        if url in visited:
            continue

        visited.add(url)
        print(f"Crawling: {url}")

        html = await fetch(session, url)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")

        for link in soup.find_all("a", href=True):
            href = link["href"]
            absolute = urljoin(url, href)

            parsed = urlparse(absolute)

            if parsed.netloc == domain and absolute not in visited:
                queue.append(absolute)


async def main():
    domain = urlparse(START_URL).netloc

    async with aiohttp.ClientSession() as session:
        tasks = []

        for i in range(CONCURRENT_REQUESTS):
            tasks.append(worker(session, domain))

        await asyncio.gather(*tasks)

    with open("links.txt", "w") as f:
        for link in visited:
            f.write(link + "\n")

    print(f"\nDone. {len(visited)} links saved.")


asyncio.run(main())