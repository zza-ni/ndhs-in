const now = new Date();
const days = ["월", "화", "수", "목", "금", "토", "일"];

function DateToStr(date = new Date()) {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }).replace(/-/g, '');
}
function isiOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
function isInStandaloneMode() {
  return ('standalone' in window.navigator) && window.navigator.standalone;
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
            const maxDate = DateToStr(getWednesdayOfWeek(DateToStr(new Date(nowWeekDate.getTime() + 4 * 24 * 60 * 60 * 1000))));
            setNextBtnDisabled(nextBtn, DateToStr(fName) === maxDate);
            let idx = getCheckedTabIndex(tabs);
            if (idx < 0) idx = 0;
            renderMenu(idx, tabs, menuWrapper, todayDateElem);
            tabs.forEach((tab, i) => {
                tab.onclick = () => updateQueryParam(data[i].date);
            });
        })
        .catch(() => {
            menuWrapper.innerHTML = "";
            if (todayDateElem) todayDateElem.textContent = "식단 데이터를 불러올 수 없습니다.";
            tabs.forEach(tab => tab.checked = false);
            tabs.forEach(tab => tab.onclick = null);
            setNextBtnDisabled(nextBtn, false);
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

    prevBtn.addEventListener("click", () => {
        let a = strToDate(getQueryDate());
        updateQueryParam(DateToStr(new Date(a.setDate(a.getDate() - 7))));
    });

    nextBtn.addEventListener("click", () => {
        let a = strToDate(getQueryDate());
        updateQueryParam(DateToStr(new Date(a.setDate(a.getDate() + 7))));
    });

    let deferredPrompt;
    const snackbar = document.getElementById('pwa-snackbar');
    const installBtn = document.getElementById('snackbar-install-btn');
    const iosModal = document.getElementById('ios-install-modal');
    const iosModalClose = document.getElementById('ios-modal-close');

    if (!isInStandaloneMode()) snackbar.style.display = 'block';

    // 설치 버튼 클릭 시 분기
    installBtn.addEventListener('click', async () => {
        if (isiOS()) {
            iosModal.style.display = 'flex';
        } else {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            snackbar.style.display = 'none';
            deferredPrompt = null;
        }
    });

    iosModalClose.onclick = () => {
        iosModal.style.display = 'none';
    };

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
        snackbar.style.display = 'none';
        deferredPrompt = null;
    });
});