const now = new Date();
const days = ["월", "화", "수", "목", "금", "토", "일"];

function DateToStr(date = new Date()) {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }).replace(/-/g, '');
}
function isiOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
function isKakaoInAppBrowser() {
  return /KAKAOTALK/i.test(window.navigator.userAgent);
}
function isSafari() {
  const ua = window.navigator.userAgent;
  return isiOS()
    && /Safari/i.test(ua)
    && !/CriOS/i.test(ua)  // iOS용 Chrome 제외
    && !isKakaoInAppBrowser()
    && !/FBAV|Line/i.test(ua); // 페이스북, 라인 등 다른 인앱 브라우저 제외
}
function isInStandaloneMode() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) 
      || (window.navigator.standalone === true);
}
function strToDate(yyyymmdd) {
    return new Date(yyyymmdd.slice(0, 4), yyyymmdd.slice(4, 6) - 1, yyyymmdd.slice(6, 8));
}
function getQueryDate() {
    const params = new URLSearchParams(window.location.search);
    return params.get('date') || DateToStr(now);
}
function getDayIdx(dateStr) {
    const date = strToDate(dateStr);
    return date.getDay() === 0 ? 6 : date.getDay() - 1;
}
function getWednesdayOfWeek(dateStr) {
    const d = strToDate(dateStr);
    const diffToMonday = (d.getDay() || 7) - 1;
    d.setDate(d.getDate() - diffToMonday + 2);
    return d;
}
function updateQueryParam(value) {
    value = value.replace(/-/g, '');
    const url = new URL(window.location.href);
    url.searchParams.set('date', value);
    history.replaceState({}, '', url);
}
function formatDate(dateStr) {
    const [_, month, day] = dateStr.match(/(\d{2})-?(\d{2})$/) || [];
    return month && day ? `${parseInt(month, 10)}/${parseInt(day, 10)}` : dateStr;
}
function setNextBtnDisabled(nextBtn, disabled) {
    nextBtn.disabled = disabled;
    nextBtn.style.opacity = disabled ? "0.5" : "";
    nextBtn.style.cursor = disabled ? "not-allowed" : "";
}
function getCheckedTabIndex(tabs) {
    return Array.from(tabs).findIndex(r => r.checked);
}
function getTodayIndex() {
    let idx = now.getDay() - 1;
    return idx < 0 ? 6 : idx;
}
function getActiveMeal() {
    const hour = now.getHours(), minute = now.getMinutes(), time = hour * 60 + minute;
    const nextDay = new Date(now); nextDay.setDate(now.getDate() + 1);
    if (time >= 1170) return { meal: "breakfast", dayIndex: (getTodayIndex() + 1) % 7, date: DateToStr(nextDay) };
    if (time < 480) return { meal: "breakfast", dayIndex: getTodayIndex(), date: DateToStr(now) };
    if (time < 780) return { meal: "lunch", dayIndex: getTodayIndex(), date: DateToStr(now) };
    return { meal: "dinner", dayIndex: getTodayIndex(), date: DateToStr(now) };
}

let tmpMealData = null;
const nowWeekDate = getWednesdayOfWeek(DateToStr(now));
const queryDateStr = getQueryDate();
let showWeekDate = getWednesdayOfWeek(queryDateStr);

function renderMenu(dayIndex, tabs, menuWrapper, todayDateElem) {
    let menuData = tmpMealData;
    const date = menuData[dayIndex]?.date || "";
    if (todayDateElem) todayDateElem.textContent = `${formatDate(date)} (${days[dayIndex]})`;
    const menu = menuData.find(m => m.day === days[dayIndex]);
    if (!menu) {
        menuWrapper.innerHTML = "<div>식단 정보가 없습니다.</div>";
        return;
    }
    let breakfastClass = "", lunchClass = "", dinnerClass = "";
    const activeMeal = getActiveMeal();
    if (date.replace(/-/g, '') === activeMeal.date && dayIndex === activeMeal.dayIndex) {
        if (activeMeal.meal === "breakfast") breakfastClass = " active";
        if (activeMeal.meal === "lunch") lunchClass = " active";
        if (activeMeal.meal === "dinner") dinnerClass = " active";
    }
    menuWrapper.innerHTML = `
        <div class="menu-block breakfast${breakfastClass}">
            <span class="meal-header">아침</span>
            <span class="meal-time">07:00 ~ 08:00</span>
            <div class="menu-list">${menu.breakfast || "-"}</div>
        </div>
        <div class="menu-block lunch${lunchClass}">
            <span class="meal-header">점심</span>
            <span class="meal-time">11:30 ~ 13:00</span>
            <div class="menu-list">${menu.lunch || "-"}</div>
        </div>
        <div class="menu-block dinner${dinnerClass}">
            <span class="meal-header">저녁</span>
            <span class="meal-time">18:00 ~ 19:30</span>
            <div class="menu-list">${menu.dinner || "-"}</div>
        </div>
    `;
}

function getJsonData(fName, tabs, menuWrapper, todayDateElem, nextBtn) {
    if (!fName) fName = showWeekDate;
    const jsonPath = `./data/${DateToStr(fName)}.json`;
    fetch(jsonPath)
        .then(response => {
            if (!response.ok) { alert("서버 에러 발생. 잠시 후 이용해주세요."); location.href = '/'; }
            return response.json();
        })
        .then(data => {
            tmpMealData = data;
            // 목요일 18:01 부터 다음 주로 넘어가는 로직
            const maxDate = DateToStr(getWednesdayOfWeek(DateToStr(new Date(now.getTime() + 4 * 24 * 3600000 + 21540000))));
            setNextBtnDisabled(nextBtn, DateToStr(fName) === maxDate);
            let idx = getCheckedTabIndex(tabs);
            if (idx < 0) idx = 0;
            renderMenu(idx, tabs, menuWrapper, todayDateElem);
            tabs.forEach((tab, i) => {
                tab.onclick = () => updateQueryParam(data[i].date);
            });
        })
        .catch(() => {
            alert("식단 정보를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
            location.href = '/';
        });
}

function onDateParamChange(newDate, tabs, menuWrapper, todayDateElem, nextBtn) {
    const idx = getDayIdx(newDate);
    tabs[idx].checked = true;
    if (DateToStr(getWednesdayOfWeek(newDate)) !== DateToStr(showWeekDate)) {
        getJsonData(getWednesdayOfWeek(newDate), tabs, menuWrapper, todayDateElem, nextBtn);
        showWeekDate = getWednesdayOfWeek(newDate);
    } else {
        renderMenu(idx, tabs, menuWrapper, todayDateElem);
    }
}

let lastDateParam = getQueryDate();
(function () {
    const original = history.replaceState;
    history.replaceState = function (...args) {
        const result = original.apply(this, args);
        const currentDate = getQueryDate();
        if (currentDate !== lastDateParam) {
            lastDateParam = currentDate;
            // DOM 요소를 매번 가져오도록 변경
            const tabs = document.querySelectorAll('.segmented-control input[name="tab"]');
            const menuWrapper = document.querySelector('.menu-wrapper');
            const todayDateElem = document.querySelector('.today-date');
            const nextBtn = document.getElementById("next-week");
            onDateParamChange(currentDate, tabs, menuWrapper, todayDateElem, nextBtn);
        }
        return result;
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll('.segmented-control input[name="tab"]');
    const menuWrapper = document.querySelector('.menu-wrapper');
    const todayDateElem = document.querySelector('.today-date');
    const prevBtn = document.getElementById("prev-week");
    const nextBtn = document.getElementById("next-week");

    if (todayDateElem) {
        todayDateElem.textContent = `${formatDate(queryDateStr)} (${days[getDayIdx(queryDateStr)]})`;
    }
    tabs[getDayIdx(queryDateStr)].checked = true;
    getJsonData(null, tabs, menuWrapper, todayDateElem, nextBtn);

    let deferredPrompt;
    const snackbar = document.getElementById('pwa-snackbar');
    const installBtn = document.getElementById('snackbar-install-btn');
    const iosModal = document.getElementById('modal-ios-install');

    // if (!isInStandaloneMode()) snackbar.style.display = 'block';

    installBtn.addEventListener('click', async () => {
        if (isiOS()) {
            iosModal.style.display = 'flex';
            if (!isSafari()) {
                iosModal.getElementsByClassName('modal-guide')[0].innerHTML = `<p>1.&nbsp;&nbsp;<img src="./src/ios-share.png" alt="공유 버튼" width="15" style="vertical-align:middle"> &nbsp; 버튼을 누르고 <b style="color:blue">Safari로 열기</b></p><p>2.&nbsp;&nbsp;<img src="./src/ios-share.png" alt="공유 버튼" width="15" style="vertical-align:middle"> &nbsp; 버튼을 누르고 <b style="color:blue">홈 화면에 추가하기</b></p>`
            }
        } else {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            snackbar.style.display = 'none';
            deferredPrompt = null;
        }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
        snackbar.style.display = 'none';
        deferredPrompt = null;
    });

    prevBtn.addEventListener("click", () => {
        let a = strToDate(getQueryDate());
        updateQueryParam(DateToStr(new Date(a.setDate(a.getDate() - 7))));
    });

    nextBtn.addEventListener("click", () => {
        let a = strToDate(getQueryDate());
        updateQueryParam(DateToStr(new Date(a.setDate(a.getDate() + 7))));
    });

    const hour = now.getHours(), minute = now.getMinutes(), time = hour * 60 + minute;
    const nextDay = new Date(now); nextDay.setDate(now.getDate() + 1);
    let paramdate = new URLSearchParams(window.location.search)
    if (time >= 1170 && !paramdate.get('date')) {
        updateQueryParam(DateToStr(nextDay));
    }

    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.querySelector('.main-content');

    // 네비게이션 클릭 이벤트
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');

            // 모든 네비게이션 아이템에서 active 클래스 제거
            navItems.forEach(nav => nav.classList.remove('active'));

            // 클릭된 아이템에 active 클래스 추가
            this.classList.add('active');

            // 페이지 전환 (실제 구현 시 라우팅 로직 추가)
            navigateToPage(page);

            // 햅틱 피드백 (모바일)
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        });
    });

    // 페이지 전환 함수
    function navigateToPage(page) {
        // 간단한 페이지 전환 애니메이션
        contentArea.classList.add('fade-out');

        setTimeout(() => {
            updatePageContent(page);
            contentArea.classList.remove('fade-out');
            contentArea.classList.add('fade-in');

            setTimeout(() => {
                contentArea.classList.remove('fade-in');
            }, 300);
        }, 150);
    }

    // 페이지 콘텐츠 업데이트
    function updatePageContent(page) {
        const pageContent = {
            'home': `
                <h1>홈</h1>
                <p>메인 페이지입니다.</p>
            `,
            'menu': `
                <h1>오늘의 식단표</h1>
                <div class="meal-card">
                    <h3>아침</h3>
                    <p>쌀밥, 소고기장국, 어묵볶음조림, 김구이, 김치</p>
                </div>
                <div class="meal-card">
                    <h3>점심</h3>
                    <p>흑미밥, 부대찌개, 고등어자반데리야끼구이, 호박나물, 배추겉절이</p>
                </div>
                <div class="meal-card">
                    <h3>저녁</h3>
                    <p>흰쌀잡곡밥, 야옥국, 보쌈, 배추&상추쌈, 무숙무침, 김치</p>
                </div>
            `,
            'notice': `
                <h1>공지사항</h1>
                <div class="notice-list">
                    <div class="notice-item">
                        <h3>식당 운영시간 변경 안내</h3>
                        <p class="notice-date">2025.08.25</p>
                        <p>추석 연휴 기간 중 식당 운영시간이 변경됩니다.</p>
                    </div>
                    <div class="notice-item">
                        <h3>메뉴 변경 안내</h3>
                        <p class="notice-date">2025.08.20</p>
                        <p>다음 주 메뉴가 일부 변경될 예정입니다.</p>
                    </div>
                </div>
            `,
            'calendar': `
                <h1>식단 달력</h1>
                <p>월간 식단표를 확인하실 수 있습니다.</p>
            `,
            'settings': `
                <h1>설정</h1>
                <div class="settings-list">
                    <div class="setting-item">알림 설정</div>
                    <div class="setting-item">테마 설정</div>
                    <div class="setting-item">앱 정보</div>
                </div>
            `
        };

        contentArea.innerHTML = pageContent[page] || '<h1>페이지를 찾을 수 없습니다</h1>';
    }

    // 키보드 네비게이션 지원
    document.addEventListener('keydown', function(e) {
        const currentActive = document.querySelector('.nav-item.active');
        const navItems = Array.from(document.querySelectorAll('.nav-item'));
        const currentIndex = navItems.indexOf(currentActive);

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            navItems[currentIndex - 1].click();
        } else if (e.key === 'ArrowRight' && currentIndex < navItems.length - 1) {
            navItems[currentIndex + 1].click();
        }
    });

    // 스와이프 제스처 지원 (터치 기기)
    let startX, startY, distX, distY;
    const threshold = 100;

    contentArea.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
    });

    contentArea.addEventListener('touchend', function(e) {
        const touch = e.changedTouches[0];
        distX = touch.clientX - startX;
        distY = touch.clientY - startY;

        if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > threshold) {
            const currentActive = document.querySelector('.nav-item.active');
            const navItems = Array.from(document.querySelectorAll('.nav-item'));
            const currentIndex = navItems.indexOf(currentActive);

            if (distX > 0 && currentIndex > 0) {
                // 오른쪽 스와이프 - 이전 탭
                navItems[currentIndex - 1].click();
            } else if (distX < 0 && currentIndex < navItems.length - 1) {
                // 왼쪽 스와이프 - 다음 탭
                navItems[currentIndex + 1].click();
            }
        }
    });
});