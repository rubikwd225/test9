import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// ========================================
// HTML要素
// ========================================

const startBtn =
    document.getElementById("startBtn");

const stopBtn =
    document.getElementById("stopBtn");

const reader =
    document.getElementById("reader");

const result =
    document.getElementById("result");

const retryBtn =
    document.getElementById("retryBtn");

const currentDay =
    document.getElementById("currentDay");


// ========================================
// 変数
// ========================================

let collectionName = "tickets_day1";

let scanner = null;

let scanning = false;

let processing = false;

let unsubscribeDay = null;

let dayLoaded = false;


// ========================================
// Firebase
// ========================================

const systemRef =
    doc(
        db,
        "settings",
        "system"
    );


// ========================================
// 日付名
// ========================================

function getDayText(day) {

    switch (day) {

        case "tickets_day1":
            return "1日目";

        case "tickets_day2":
            return "2日目";

        case "tickets_day3":
            return "3日目";

        default:
            return "不明";

    }

}


// ========================================
// Firebaseの日付監視
// ========================================

function startDayListener() {

    unsubscribeDay =
        onSnapshot(

            systemRef,

            snapshot => {

                if (!snapshot.exists()) {

                    currentDay.textContent =
                        "日付設定がありません";

                    dayLoaded = false;

                    return;

                }


                const data =
                    snapshot.data();


                const activeDay =
                    data.activeDay;


                if (
                    activeDay !== "tickets_day1" &&
                    activeDay !== "tickets_day2" &&
                    activeDay !== "tickets_day3"
                ) {

                    console.error(
                        "activeDayが不正です:",
                        activeDay
                    );

                    currentDay.textContent =
                        "日付設定が不正です";

                    dayLoaded = false;

                    return;

                }


                collectionName =
                    activeDay;


                currentDay.textContent =
                    `現在：${getDayText(activeDay)}`;


                dayLoaded = true;


                console.log(
                    "現在の日付:",
                    collectionName
                );

            },

            error => {

                console.error(
                    "日付の取得に失敗しました:",
                    error
                );

                currentDay.textContent =
                    "日付の取得に失敗しました";

                dayLoaded = false;

            }

        );

}


startDayListener();


// ========================================
// スキャン開始
// ========================================

startBtn.onclick = () => {

    if (!dayLoaded) {

        alert(
            "現在の日付を読み込んでいます。"
        );

        return;

    }

    startScanner();

};


// ========================================
// カメラ開始
// ========================================

async function startScanner() {

    if (scanning) {

        return;

    }


    processing = false;


    result.style.display =
        "none";

    result.innerHTML =
        "";


    retryBtn.style.display =
        "none";


    startBtn.style.display =
        "none";


    stopBtn.style.display =
        "block";


    reader.style.display =
        "block";


    scanner =
        new Html5Qrcode("reader");


    try {

        scanning = true;


        await scanner.start(

            {
                facingMode:
                    "environment"
            },

            {
                fps: 10,

                qrbox: {
                    width: 250,
                    height: 250
                }

            },

            scanSuccess,

            () => {}

        );

    }

    catch (error) {

        console.error(error);

        scanning = false;

        reader.style.display =
            "none";

        stopBtn.style.display =
            "none";

        startBtn.style.display =
            "block";


        showResult(
            "error",
            "カメラエラー",
            "カメラを起動できませんでした。"
        );

    }

}


// ========================================
// QR読み取り成功
// ========================================

async function scanSuccess(text) {

    if (
        !scanning ||
        processing
    ) {

        return;

    }


    processing = true;


    await stopScanner();


    const ticketId =
        text.trim();


    await processTicket(ticketId);

}


// ========================================
// 整理券処理
// ========================================

async function processTicket(ticketId) {

    try {

        // ====================================
        // まず通常整理券を検索
        // ====================================

        let ticketRef =
            doc(
                db,
                collectionName,
                ticketId
            );


        let snap =
            await getDoc(ticketRef);


        let isSpecial =
            false;


        // ====================================
        // 通常券になければ特別招待券
        // ====================================

        if (!snap.exists()) {

            ticketRef =
                doc(
                    db,
                    "special_tickets",
                    ticketId
                );


            snap =
                await getDoc(ticketRef);


            if (snap.exists()) {

                isSpecial =
                    true;

            }

        }


        // ====================================
        // どちらにもない
        // ====================================

        if (!snap.exists()) {

            showResult(
                "error",
                "無効な整理券",
                "このQRコードの整理券は見つかりません。"
            );

            return;

        }


        const data =
            snap.data();


        const number =
            data.number ??
            ticketId;


        const status =
            data.status ??
            "waiting";


        // ====================================
        // 無効
        // ====================================

        if (status === "invalid") {

            showResult(
                "danger",
                "無効な整理券",
                isSpecial
                    ? "この特別招待券は無効になっています。"
                    : `No.${number} は無効になっています。`,
                isSpecial ? null : number
            );

            return;

        }


        // ====================================
        // 受付前 → 受付済み
        // ====================================

        if (status === "waiting") {

            await updateDoc(

                ticketRef,

                {
                    status: "accepted"
                }

            );


            showResult(
                "success",
                isSpecial
                    ? "特別招待券・受付完了！"
                    : "受付完了！",
                isSpecial
                    ? "特別招待券を受付済みにしました。"
                    : `No.${number} を受付済みにしました。`,
                isSpecial ? null : number
            );

            return;

        }


        // ====================================
        // 受付済み
        // ====================================

        if (status === "accepted") {

            showResult(
                "warning",
                "すでに受付済み",
                isSpecial
                    ? "この特別招待券はすでに受付されています。"
                    : `No.${number} はすでに受付されています。`,
                isSpecial ? null : number
            );

            return;

        }


        // ====================================
        // 入場済み
        // ====================================

        if (status === "entered") {

            showResult(
                "danger",
                "すでに入場済み",
                isSpecial
                    ? "この特別招待券はすでに入場済みです。"
                    : `No.${number} はすでに入場済みです。`,
                isSpecial ? null : number
            );

            return;

        }


        // ====================================
        // 不明
        // ====================================

        showResult(
            "error",
            "不明な状態",
            "チケットの状態を確認できません。"
        );

    }

    catch (error) {

        console.error(error);


        showResult(
            "error",
            "処理エラー",
            "データの処理に失敗しました。"
        );

    }

}


// ========================================
// 結果表示
// ========================================

function showResult(
    type,
    title,
    message,
    number = null
) {

    result.className =
        type;


    result.style.display =
        "block";


    let html = "";


    if (number !== null) {

        html += `

            <div class="ticket-number">
                No.${number}
            </div>

        `;

    }


    html += `

        <div class="result-title">
            ${title}
        </div>

        <div class="result-message">
            ${message}
        </div>

    `;


    result.innerHTML =
        html;


    retryBtn.style.display =
        "block";

}


// ========================================
// カメラ停止
// ========================================

async function stopScanner() {

    if (scanner) {

        try {

            await scanner.stop();

        }
        catch (error) {

            console.log(
                "scanner.stop error:",
                error
            );

        }


        try {

            await scanner.clear();

        }
        catch (error) {

            console.log(
                "scanner.clear error:",
                error
            );

        }


        scanner = null;

    }


    scanning = false;


    reader.style.display =
        "none";


    stopBtn.style.display =
        "none";

}


// ========================================
// カメラ閉じる
// ========================================

stopBtn.onclick =
    async () => {

        await stopScanner();


        result.style.display =
            "none";

        result.innerHTML =
            "";


        retryBtn.style.display =
            "none";


        startBtn.style.display =
            "block";


        processing = false;

    };


// ========================================
// 次の整理券
// ========================================

retryBtn.onclick = () => {

    result.style.display =
        "none";

    result.innerHTML =
        "";


    retryBtn.style.display =
        "none";


    processing = false;


    startScanner();

};