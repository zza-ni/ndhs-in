import json
import os
import sys
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup as bs
from dotenv import load_dotenv
from github import Github

load_dotenv()


def get_wednesday_of_week(date=None):
    if date is None:
        date = datetime.now()
    # date.weekday(): 월=0, 화=1, ..., 일=6
    # 수요일은 2이므로, 오늘이 무슨 요일인지에 따라 수요일까지 차이 계산
    diff_to_wednesday = 2 - date.weekday()
    wednesday = date + timedelta(days=diff_to_wednesday + 7)  # 다음 주 수요일로 설정
    return wednesday.strftime("%Y-%m-%d")


def get_bob(date="2025-08-06"):
    r = requests.get(
        f"https://ndhs.or.kr/site/main/schedule/calendar/week_menu_EP?date={date}"
    )
    soup = bs(r.text, "html.parser")
    table = soup.find("ul", {"class": "flex-table"})

    menus = []
    for row in table.find_all("li", class_="flex-tb"):
        date = row.find("div", class_="date").span.text.strip()
        day = row.find("div", class_="day").span.text.strip()
        breakfast = row.find("div", class_="breakfast").find("pre").text.strip()
        if breakfast == "":
            print(f"Error: No breakfast menu found for {date} ({day})")
            sys.exit(-1)
        lunch = row.find("div", class_="lunch").find("pre").text.strip()
        dinner = row.find("div", class_="dinner").find("pre").text.strip()
        menus.append(
            {
                "date": date,
                "day": day,
                "breakfast": breakfast.replace("\r\n", ", "),
                "lunch": lunch.replace("\r\n", ", "),
                "dinner": dinner.replace("\r\n", ", "),
            }
        )
    return menus


def commit_to_github(file_path):
    token = os.getenv("github_token")
    repo_name = "JeongSJ/ndhs-bob"
    branch = "dev"
    msg = "[Auto] Update " + file_path.split("/")[-1]

    g = Github(token)
    repo = g.get_repo(repo_name)

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    try:
        file = repo.get_contents(file_path, ref=branch)
        repo.update_file(file.path, msg, content, file.sha, branch=branch)
    except:
        repo.create_file(file_path, msg, content, branch=branch)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{now} Uploaded to GitHub successfully.")


date = get_wednesday_of_week()
fName = f"./public/data/{date.replace('-', '')}.json"

# 파일 이미 있으면
if os.path.isfile(fName):
    sys.exit(0)

# data가 None이면
data = get_bob(date)
if data is None:
    sys.exit(-1)

with open(fName, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
commit_to_github(fName)
