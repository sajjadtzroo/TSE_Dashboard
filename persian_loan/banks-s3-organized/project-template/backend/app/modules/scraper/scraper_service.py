"""
Web Scraping Service for Iranian Bank Websites
"""

from typing import Dict, List, Optional

import httpx
from bs4 import BeautifulSoup

from app.core.logger import get_logger

logger = get_logger(__name__)


class ScraperService:
    """Service for web scraping bank loan data."""

    def __init__(self):
        """Initialize scraper service."""
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        self.timeout = 30.0

    async def scrape_url(
        self, url: str, deep_scrape: bool = False
    ) -> Dict[str, any]:
        """
        Scrape a single URL for loan data.

        Args:
            url: URL to scrape
            deep_scrape: Whether to follow links and scrape multiple pages

        Returns:
            Dictionary with scraped data
        """
        logger.info(f"Scraping URL: {url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self.headers, follow_redirects=True)
                response.raise_for_status()

                # Parse HTML
                soup = BeautifulSoup(response.text, "lxml")

                # Extract data
                data = self._extract_loan_data(soup, url)

                # Deep scrape if requested
                if deep_scrape:
                    links = self._extract_links(soup, url)
                    logger.info(f"Found {len(links)} links for deep scraping")
                    data["related_pages"] = links[:10]  # Limit to 10 links

                logger.success(f"Successfully scraped {url}")
                return {
                    "url": url,
                    "status": "success",
                    "data": data,
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error scraping {url}: {e}")
            return {
                "url": url,
                "status": "failed",
                "error": f"HTTP {e.response.status_code}",
            }
        except httpx.RequestError as e:
            logger.error(f"Request error scraping {url}: {e}")
            return {
                "url": url,
                "status": "failed",
                "error": str(e),
            }
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return {
                "url": url,
                "status": "failed",
                "error": str(e),
            }

    async def scrape_multiple_urls(
        self, urls: List[str], deep_scrape: bool = False
    ) -> List[Dict[str, any]]:
        """
        Scrape multiple URLs.

        Args:
            urls: List of URLs to scrape
            deep_scrape: Whether to follow links

        Returns:
            List of scraping results
        """
        logger.info(f"Scraping {len(urls)} URLs")

        results = []
        for url in urls:
            result = await self.scrape_url(url, deep_scrape)
            results.append(result)

        successful = sum(1 for r in results if r["status"] == "success")
        logger.info(f"Scraping completed: {successful}/{len(urls)} successful")

        return results

    def _extract_loan_data(self, soup: BeautifulSoup, url: str) -> Dict[str, any]:
        """
        Extract loan data from parsed HTML.

        Args:
            soup: BeautifulSoup object
            url: Source URL

        Returns:
            Dictionary with extracted loan data
        """
        data = {
            "title": self._get_page_title(soup),
            "content": self._extract_text_content(soup),
            "tables": self._extract_tables(soup),
            "loan_info": self._extract_loan_info(soup),
        }

        return data

    def _get_page_title(self, soup: BeautifulSoup) -> str:
        """Extract page title."""
        title_tag = soup.find("title")
        if title_tag:
            return title_tag.get_text(strip=True)

        h1_tag = soup.find("h1")
        if h1_tag:
            return h1_tag.get_text(strip=True)

        return ""

    def _extract_text_content(self, soup: BeautifulSoup) -> str:
        """Extract main text content from page."""
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Get text
        text = soup.get_text(separator="\n", strip=True)

        # Clean up extra whitespace
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)

    def _extract_tables(self, soup: BeautifulSoup) -> List[Dict[str, any]]:
        """Extract tables from HTML."""
        tables = []

        for table in soup.find_all("table"):
            table_data = {
                "headers": [],
                "rows": [],
            }

            # Extract headers
            thead = table.find("thead")
            if thead:
                headers = thead.find_all("th")
                table_data["headers"] = [h.get_text(strip=True) for h in headers]

            # Extract rows
            tbody = table.find("tbody") or table
            for row in tbody.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if cells:
                    table_data["rows"].append(
                        [cell.get_text(strip=True) for cell in cells]
                    )

            if table_data["headers"] or table_data["rows"]:
                tables.append(table_data)

        return tables

    def _extract_loan_info(self, soup: BeautifulSoup) -> Dict[str, any]:
        """
        Extract loan-specific information using Persian keywords.

        Args:
            soup: BeautifulSoup object

        Returns:
            Dictionary with loan information
        """
        loan_info = {}

        # Persian keywords to search for
        keywords = {
            "مبلغ تسهیلات": "loan_amount",
            "نرخ سود": "interest_rate",
            "مدت بازپرداخت": "repayment_period",
            "ضامن": "guarantor",
            "وثیقه": "collateral",
            "سقف تسهیلات": "loan_ceiling",
            "شرایط": "conditions",
        }

        text = soup.get_text()

        for persian_key, english_key in keywords.items():
            if persian_key in text:
                # Find the line containing the keyword
                lines = text.split("\n")
                for line in lines:
                    if persian_key in line:
                        loan_info[english_key] = line.strip()
                        break

        return loan_info

    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Extract all links from page."""
        links = []

        for link in soup.find_all("a", href=True):
            href = link["href"]

            # Convert relative URLs to absolute
            if href.startswith("/"):
                from urllib.parse import urljoin

                href = urljoin(base_url, href)

            # Filter relevant links (loan-related pages)
            loan_keywords = ["تسهیلات", "وام", "loan", "credit", "facility"]
            if any(keyword in href.lower() for keyword in loan_keywords):
                links.append(href)

        return list(set(links))  # Remove duplicates

    async def scrape_bank_website(self, bank_id: str, base_url: str) -> Dict[str, any]:
        """
        Scrape a bank's website for loan information.

        Args:
            bank_id: Bank identifier
            base_url: Bank's website URL

        Returns:
            Dictionary with scraped bank data
        """
        logger.info(f"Scraping bank website: {bank_id} - {base_url}")

        # Scrape main page
        main_result = await self.scrape_url(base_url, deep_scrape=True)

        if main_result["status"] != "success":
            return main_result

        # Extract and scrape related loan pages
        related_urls = main_result.get("data", {}).get("related_pages", [])
        related_results = []

        if related_urls:
            logger.info(f"Scraping {len(related_urls)} related pages")
            for url in related_urls[:5]:  # Limit to 5 related pages
                result = await self.scrape_url(url, deep_scrape=False)
                related_results.append(result)

        return {
            "bank_id": bank_id,
            "base_url": base_url,
            "main_page": main_result,
            "related_pages": related_results,
            "total_pages_scraped": 1 + len(related_results),
        }
