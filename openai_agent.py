from agents import Agent, Runner, RunConfig, function_tool
from dotenv import load_dotenv
import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

load_dotenv(override=True)

os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

@function_tool
def fetch_uc_page(url: str) -> dict:
    """
    Fetch a UC-related webpage, extract text and links.
    Only works for UC domains.
    """
    try:
        parsed = urlparse(url)

        if "uc.edu" not in parsed.netloc and "erezlife.com" not in parsed.netloc:
            return {"error": "Only UC-related domains allowed."}

        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        for script in soup(["script", "style"]):
            script.extract()

        text = soup.get_text(separator=" ", strip=True)
        text = text[:4000]  

        links = []
        for a in soup.find_all("a", href=True):
            href = urljoin(url, a["href"])
            if "uc.edu" in href or "erezlife.com" in href:
                links.append(href)

        return {
            "url": url,
            "content": text,
            "links": list(set(links))[:10]  
        }

    except Exception as e:
        return {"error": str(e)}


agent = Agent(
    name="UC Research Assistant",
    instructions="""
You are a web research agent for the University of Cincinnati.

GOAL:
Find accurate answers by browsing UC websites.

RULES:
- You MUST use the fetch_uc_page tool to explore pages.
- Start from a relevant UC page if needed.
- Decide which links to follow based on relevance.
- Limit exploration to a few steps (3–5).
- When you find the answer, STOP.

OUTPUT FORMAT:
- Final Answer
- Source URL(s)
""",
    tools=[fetch_uc_page]
)


result = Runner.run_sync(
    agent,
    """
what  part time jobs are available on campus?
""",
    run_config=RunConfig(model="gpt-5.4"),
)

print(result.final_output)