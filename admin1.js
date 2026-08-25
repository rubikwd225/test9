import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// ========================================
// HTML
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

let collectionName =
    "tickets_day1";

let scanner = null;

let scanning = false;

let processing = false;


// ========================================
// Firebaseの現在日付を監視
// ========================================

const systemRef =
    doc(
        db,
        "settings",
        "system"
    );


onSnapshot(

    systemRef,

    snapshot => {

        // settings/systemがない場合

        if (!snapshot.exists()) {

            console.error(
                "settings/system が見つかりません"
            );

            currentDay.textContent =
                "日付設定がありません";

            return;

        }


        const data =
            snapshot.data();


        const activeDay =
            data.activeDay;


        // ====================================
        // 日付チェック
        // ====================================

        if (
            activeDay !== "tickets_day1" &&
            activeDay !== "tickets_day2"
        ) {

            console.error(
                "activeDayの値が正しくありません"
            );

            currentDay.textContent =
                "日付設定エラー";

            return;

        }


        // ====================================
        // 使用するコレクション変更
        // ====================================

        collectionName =
            activeDay;


        // ====================================
        // 現在の日付表示
        // ====================================

        currentDay.textContent =

            activeDay === "tickets_day1"

                ? "現在：1日目"

                : "現在：2日目";


        console.log(
            "現在の日付:",
            activeDay
        );

    },

    error => {

        console.error(
            "日付監視エラー:",
            error
        );


        currentDay.textContent =
            "日付を取得できません";

    }

);


// ========================================
// スキャン開始
// ========================================

startBtn.onclick = () => {

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


    // QRを読み取った瞬間に
    // カメラ停止

    await stopScanner();


    const ticketId =
        text.trim();


    // チケット処理

    await processTicket(ticketId);

}


// ========================================
// チケット処理
// ========================================

async function processTicket(ticketId) {

    try {

        const ticketRef =
            doc(
                db,
                collectionName,
                ticketId
            );


        const snap =
            await getDoc(ticketRef);


        // ====================================
        // 存在しない
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
            data.number ?? ticketId;


        // ====================================
        // 受付前
        // ====================================

        if (
            data.status === "waiting"
        ) {

            await updateDoc(

                ticketRef,

                {
                    status: "accepted"
                }

            );


            showResult(

                "success",

                "受付完了！",

                `No.${number} を受付済みにしました。`,

                number

            );


            return;

        }


        // ====================================
        // 受付済み
        // ====================================

        if (
            data.status === "accepted"
        ) {

            showResult(

                "warning",

                "すでに受付済み",

                `No.${number} はすでに受付されています。`,

                number

            );


            return;

        }


        // ====================================
        // 入場済み
        // ====================================

        if (
            data.status === "entered"
        ) {

            showResult(

                "danger",

                "⚠ すでに入場済み",

                `No.${number} はすでに入場済みです。`,

                number

            );


            return;

        }


        // ====================================
        // 不明
        // ====================================

        showResult(

            "error",

            "不明な状態",

            `No.${number} の状態を確認できません。`,

            number

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