import asyncio
import json
import os
import re
import time

import aiohttp
import oci
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

COOKIE_FILE = "session_cookies.json"
MAX_CONCURRENT_TASKS = 20
s = requests.Session()
s.headers.update({"User-Agent": "ndhs-bob"})
semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
load_dotenv()
NDHS_ID = os.getenv("NDHS_ID")
NDHS_PW = os.getenv("NDHS_PW")
oci_config = {
    "user": os.getenv("OCI_USER"),
    "fingerprint": os.getenv("OCI_FINGERPRINT"),
    "tenancy": os.getenv("OCI_TENANCY"),
    "region": os.getenv("OCI_REGION"),
    "key_file": os.getenv("OCI_KEY_FILE"),
}
object_storage = oci.object_storage.ObjectStorageClient(oci_config)
DB_FILE = "notice_db.json"


def load_db():
    if os.path.isfile(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_cookies(session):
    cookies_dict = session.cookies.get_dict()
    with open(COOKIE_FILE, "w") as f:
        json.dump(cookies_dict, f)


def load_cookies(session):
    with open(COOKIE_FILE, "r") as f:
        cookies = json.load(f)
    if session is None:
        return cookies.items()
    # requests 쿠키로 변환하여 세션에 추가
    jar = requests.cookies.RequestsCookieJar()
    for k, v in cookies.items():
        jar.set(k, v)
    session.cookies = jar


def login():
    session = requests.Session()
    payload = {
        "loginType": "basic",
        "userType": "S",
        "recruitDiv": "regular",
        "name": "",
        "bdate": "",
        "mobile": "",
        "userId": NDHS_ID,
        "password": NDHS_PW,
    }
    response = session.post(
        "https://portal.ndhs.or.kr/login", data=payload, allow_redirects=False
    )
    if response.headers.get("Location").find("dashboard") != -1:
        print("로그인 성공")
        save_cookies(session)
        return session
    else:
        print("로그인 실패")
        return None


def use_session():
    s = requests.Session()
    try:
        load_cookies(s)
        # 쿠키로 로그인 유지 가능 여부 확인
        response = s.get("https://portal.ndhs.or.kr/studentLifeSupport/carte/list")
        if "로그인" in response.text or response.status_code != 200:
            print("세션 만료 또는 로그인 필요, 로그인 다시 시도")
            s = login()
        else:
            print("저장된 세션으로 로그인 성공")
    except FileNotFoundError:
        print("쿠키 파일이 없어 로그인 실행")
        s = login()
    return s


def get_table(boardId="01", page=1, size=10):
    r = s.get(
        f"https://portal.ndhs.or.kr/board/list?boardId={boardId}&pageIndex={page}&pageSize={size}"
    )
    soup = BeautifulSoup(r.text, "html.parser")
    table = soup.find("table", class_="table-list")
    result = []

    # tbody 내 모든 행(tr) 탐색
    for row in table.select("tbody tr"):
        cols = row.find_all("td")
        if len(cols) >= 5:
            # no = cols[0].get_text(strip=True)
            gubun = cols[1].get_text(strip=True)
            title = cols[2].get_text(" ", strip=True)  # 공지 label 포함해서 글자만 뽑음
            attach = True if cols[3].find("i") else False
            date = cols[4].get_text(strip=True)
            wr_id = row.get("data-wr-id", 0)

            result.append(
                {
                    "No": wr_id,
                    "구분": gubun,
                    "제목": title,
                    "첨부": attach,
                    "등록일시": date,
                }
            )

    return result


def get_detail(id, boardId="01"):
    if id is None:
        raise ValueError("boardId cannot be None")
    r = s.get(f"https://portal.ndhs.or.kr/board/detail?boardId={boardId}&wrId={id}")
    print(f"https://portal.ndhs.or.kr/board/detail?boardId={boardId}&wrId={id}")
    soup = BeautifulSoup(r.text, "html.parser")
    soup = soup.find("div", class_="container-fluid mt20")
    detail = {}

    # 제목
    title_tag = soup.find("h5")
    span_tag = title_tag.find("span", class_="label")
    tag = span_tag.get_text()
    span_tag.extract()  # 요소 트리에서 제거

    detail["태그"] = tag if tag else ""
    detail["제목"] = title_tag.get_text(strip=True) if title_tag else ""

    # 작성자
    author_tag = soup.find("div", class_="col-xs-8 col-sm-7")
    detail["작성자"] = (
        author_tag.get_text(strip=True).replace("작성자｜", "").strip()
        if author_tag
        else ""
    )

    # 등록일시
    date_tag = soup.find("div", class_="col-xs-12 col-sm-3 text-left")
    detail["등록일시"] = (
        date_tag.get_text(strip=True).replace("등록일시｜", "").strip()
        if date_tag
        else ""
    )

    # 내용
    panel_body = soup.find_all("div", class_="panel-body")[1]
    content_tag = panel_body.find("div", class_="row")
    content_tag = soup.find("div", class_="col-xs-12 col-sm-12 col-md-12")
    inner_html = "".join(
        str(child).replace("\xa0", " ") for child in content_tag.contents
    )
    detail["내용"] = inner_html.strip() if content_tag else ""

    return detail

    # soup = BeautifulSoup(html, "html.parser")
    # table = soup.find_all("div", class_="panel")[1]
    # panel_body = table.find("div", class_="panel-body")

    # first_row = panel_body.find("div", class_="row")
    # print(first_row.prettify())


async def fetch_detail(session, id, boardId="01"):
    async with semaphore:
        if id is None:
            raise ValueError("boardId cannot be None")

        url = f"https://portal.ndhs.or.kr/board/detail?boardId={boardId}&wrId={id}"
        async with session.get(url) as response:
            text = await response.text()
            soup = BeautifulSoup(text, "html.parser")
            soup = soup.find("div", class_="container-fluid mt20")
            detail = {}
            detail["id"] = id

            # 제목
            title_tag = soup.find("h5")
            span_tag = title_tag.find("span", class_="label")
            tag = span_tag.get_text()
            span_tag.extract()  # 요소 트리에서 제거
            detail["tag"] = tag if tag else ""
            detail["title"] = title_tag.get_text(strip=True) if title_tag else ""

            # 작성자
            author_tag = soup.find("div", class_="col-xs-8 col-sm-7")
            detail["author"] = (
                author_tag.get_text(strip=True).replace("작성자｜", "").strip()
                if author_tag
                else ""
            )

            # 등록일시
            date_tag = soup.find("div", class_="col-xs-12 col-sm-3 text-left")
            detail["update"] = (
                date_tag.get_text(strip=True).replace("등록일시｜", "").strip()
                if date_tag
                else ""
            )

            # 내용
            panel_body = soup.find_all("div", class_="panel-body")[1]
            content_tag = panel_body.find("div", class_="row")
            content_tag = soup.find("div", class_="col-xs-12 col-sm-12 col-md-12")

            # 이미지 다운로드
            img_tags = content_tag.select("img[src]")
            i = 0
            for img_tag in img_tags:
                if not img_tag.has_attr("width"):
                    print("삭제", url, img_tag)
                    img_tag.decompose()
                    continue
                img_src = img_tag["src"]
                if "download?fileKey=" in img_src:
                    i += 1
                    filename = f"{boardId}_{id}_{i}.jpg"
                    img_tag["src"] = f"[IMGPATH]/{filename}"
                    await download_image(session, img_src, filename)

            inner_html = "".join(
                str(child).replace("\xa0", " ") for child in content_tag.contents
            )
            inner_html = inner_html.replace('src="/', 'src="https://portal.ndhs.or.kr/')
            detail["body"] = inner_html.strip() if content_tag else ""

            return detail


async def download_image(session, img_src, filename):
    img_url = "https://portal.ndhs.or.kr" + img_src

    async with session.get(img_url) as resp:
        if resp.status == 200:
            response_data = await resp.read()
            response = object_storage.put_object(
                namespace_name="axvdwu2jts2t",
                bucket_name="ndhs-bob",
                object_name=filename,
                put_object_body=response_data,
                content_type="image/jpeg",
            )
        else:
            print(f"이미지 다운로드 실패: {img_url} (상태코드 {resp.status})")


async def main():
    # 1. 기존 DB 로드
    db = load_db()
    db_no_set = set(str(item["id"]) for item in db)

    # 2. 새 공지 목록 가져오기
    items = get_table(size=50)
    new_items = [item for item in items if str(item["No"]) not in db_no_set]

    print(f"DB에 없는 새 글 {len(new_items)}개")

    # 3. 새 글만 fetch_detail
    new_details = []
    if new_items:
        async with aiohttp.ClientSession(cookies=load_cookies(None)) as session:
            tasks = [fetch_detail(session, item["No"]) for item in new_items]
            new_details = await asyncio.gather(*tasks)

    # 4. DB에 추가 및 저장
    db.extend(new_details)
    save_db(db)

    for detail in new_details:
        print(detail)


s = use_session()

if __name__ == "__main__":
    now = time.time()
    asyncio.run(main())
    print(f"실행 시간: {time.time() - now} seconds")
