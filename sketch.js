// 全域變數
let allQuestions = [];
let quizQuestions = []; // 每次隨機抽取的 5 題
let table;
let currentQuestion = 0;
let scoreCount = 0;
let gameState = "LOADING"; // "LOADING", "QUIZ", "FEEDBACK", "END"
let selectedOption = -1;
let feedbackTimer = 0;

// 響應式佈局變數
let optionButtons = [];
let restartButton = {};
let scaleFactor = 1;
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

function preload() {
  // 從 CSV 載入 15 題題庫
  table = loadTable('question.csv', 'csv', 'header', loadSuccess, loadError);
}

function loadSuccess() {
  allQuestions = [];
  for (let r = 0; r < table.getRowCount(); r++) {
    let row = table.getRow(r);
    let ansLetter = row.getString('answer').trim().toUpperCase();
    let ansIdx = ansLetter.charCodeAt(0) - 65; // 'A'->0, 'B'->1, 'C'->2, 'D'->3

    allQuestions.push({
      question: row.getString('question'),
      options: [
        row.getString('option_a'),
        row.getString('option_b'),
        row.getString('option_c'),
        row.getString('option_d')
      ],
      correct: ansIdx >= 0 && ansIdx <= 3 ? ansIdx : 0
    });
  }
  
  initQuiz();
}

function loadError() {
  console.warn("無法載入 question.csv，使用預設題目");
  useFallbackQuestions();
  initQuiz();
}

function useFallbackQuestions() {
  allQuestions = [
    { question: "2 + 2 = ?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "若 3x + 5 = 20，則 x 的值為何？", options: ["3", "5", "7", "15"], correct: 1 },
    { question: "已知直角三角形兩直角邊為 3 與 4，求斜邊長？", options: ["5", "6", "7", "8"], correct: 0 },
    { question: "計算 (-2)³ × 3 + (-4) 的值為何？", options: ["-28", "-20", "20", "28"], correct: 0 },
    { question: "將 0.000052 以科學記號表示，何者正確？", options: ["5.2 × 10⁻⁴", "5.2 × 10⁻⁵", "52 × 10⁻⁶", "0.52 × 10⁻⁴"], correct: 1 }
  ];
}

// 每次測驗開始或重新開始時，從總題庫中隨機抽取 5 題
function initQuiz() {
  if (allQuestions.length === 0) return;
  
  // 複製一份題庫陣列以便洗牌
  let shuffled = [...allQuestions];
  
  // Fisher-Yates 洗牌演算法
  for (let i = shuffled.length - 1; i > 0; i--) {
    let j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // 取前 5 題（若題庫少於 5 題則取全部）
  let pickCount = Math.min(5, shuffled.length);
  quizQuestions = shuffled.slice(0, pickCount);
  
  currentQuestion = 0;
  scoreCount = 0;
  gameState = "QUIZ";
  selectedOption = -1;
}

function setup() {
  let container = document.getElementById('canvas-container');
  let w = container ? container.clientWidth : 800;
  let h = container ? container.clientHeight : 600;

  let canvas = createCanvas(w, h);
  if (container) canvas.parent('canvas-container');

  // 設定字體為 Google Fonts 引入的 Chiron Sung HK
  textFont('Chiron Sung HK');
  recalculateLayout();
}

function recalculateLayout() {
  scaleFactor = width / BASE_WIDTH;

  optionButtons = [];
  let startY = height * 0.38;
  let btnHeight = 56 * scaleFactor;
  let spacing = 14 * scaleFactor;
  let btnWidth = width - (80 * scaleFactor);
  let startX = 40 * scaleFactor;

  for (let i = 0; i < 4; i++) {
    optionButtons.push({
      x: startX,
      y: startY + i * (btnHeight + spacing),
      w: btnWidth,
      h: btnHeight,
      hover: false
    });
  }

  let rW = 220 * scaleFactor;
  let rH = 56 * scaleFactor;
  restartButton = {
    x: width / 2 - rW / 2,
    y: height * 0.72,
    w: rW,
    h: rH,
    hover: false
  };
}

function windowResized() {
  let container = document.getElementById('canvas-container');
  if (container) {
    let w = container.clientWidth;
    let h = w * 0.75; // 保持 4:3 比例
    resizeCanvas(w, h);
    recalculateLayout();
  }
}

function draw() {
  background(15, 23, 42); // 深色質感背景

  // 繪製主面板外框
  fill(30, 41, 59, 235);
  stroke(71, 85, 105);
  strokeWeight(2 * scaleFactor);
  rect(16 * scaleFactor, 16 * scaleFactor, width - (32 * scaleFactor), height - (32 * scaleFactor), 20 * scaleFactor);

  if (gameState === "LOADING") {
    textAlign(CENTER, CENTER);
    fill(255);
    textSize(20 * scaleFactor);
    text("題庫載入與隨機抽题中...", width / 2, height / 2);
  } else if (gameState === "QUIZ" || gameState === "FEEDBACK") {
    drawQuizScreen();
  } else if (gameState === "END") {
    drawEndScreen();
  }

  updateHoverStates();
}

function drawQuizScreen() {
  if (quizQuestions.length === 0) return;
  let q = quizQuestions[currentQuestion];
  let pointsPerQ = 100 / quizQuestions.length; // 每題配分（5題共100分）

  // 1. 進度條
  let progress = currentQuestion / quizQuestions.length;
  let barX = 40 * scaleFactor;
  let barY = 36 * scaleFactor;
  let barW = width - (80 * scaleFactor);
  let barH = 8 * scaleFactor;

  noStroke();
  fill(51, 65, 85);
  rect(barX, barY, barW, barH, barH / 2);
  fill(129, 140, 248);
  rect(barX, barY, barW * progress, barH, barH / 2);

  // 2. 題號與即時分數
  fill(148, 163, 184);
  textSize(Math.max(12, 14 * scaleFactor));
  textAlign(LEFT, CENTER);
  text(`隨機第 ${currentQuestion + 1} 題 / 共 ${quizQuestions.length} 題`, barX, barY + 22 * scaleFactor);

  textAlign(RIGHT, CENTER);
  text(`即時得分: ${scoreCount} 分`, width - barX, barY + 22 * scaleFactor);

  // 3. 題目內容
  fill(248, 250, 252);
  textSize(Math.max(15, 20 * scaleFactor));
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(q.question, barX, barY + 44 * scaleFactor, barW, 65 * scaleFactor);
  textStyle(NORMAL);

  // 4. 四個選項按鈕
  for (let i = 0; i < 4; i++) {
    let btn = optionButtons[i];
    let isHover = btn.hover && gameState === "QUIZ";

    let bgColor = color(40, 53, 73);
    let borderColor = color(71, 85, 105);
    let textColor = color(241, 245, 249);

    if (gameState === "QUIZ") {
      if (isHover) {
        bgColor = color(79, 70, 229);
        borderColor = color(165, 180, 252);
      }
    } else if (gameState === "FEEDBACK") {
      if (i === q.correct) {
        bgColor = color(34, 197, 94); // 答對 - 翡翠綠
        borderColor = color(134, 239, 172);
      } else if (i === selectedOption) {
        bgColor = color(239, 68, 68); // 答錯 - 胭脂紅
        borderColor = color(252, 165, 165);
      } else {
        bgColor = color(30, 41, 59, 100);
        textColor = color(100, 116, 139);
      }
    }

    stroke(borderColor);
    strokeWeight(2 * scaleFactor);
    fill(bgColor);
    rect(btn.x, btn.y, btn.w, btn.h, 12 * scaleFactor);

    // 選項文字
    noStroke();
    fill(textColor);
    textSize(Math.max(13, 17 * scaleFactor));
    textAlign(LEFT, CENTER);
    let label = String.fromCharCode(65 + i);
    text(`${label}.  ${q.options[i]}`, btn.x + 20 * scaleFactor, btn.y + btn.h / 2);
  }

  // 答題反饋延遲自動下一題
  if (gameState === "FEEDBACK") {
    if (millis() - feedbackTimer > 1200) {
      currentQuestion++;
      if (currentQuestion >= quizQuestions.length) {
        gameState = "END";
      } else {
        gameState = "QUIZ";
        selectedOption = -1;
      }
    }
  }
}

function drawEndScreen() {
  textAlign(CENTER, CENTER);
  fill(248, 250, 252);
  textSize(Math.max(20, 32 * scaleFactor));
  textStyle(BOLD);
  text("🎉 測驗順利完成！", width / 2, height * 0.18);

  // 成績統計卡片
  let cardW = width * 0.6;
  let cardH = height * 0.34;
  let cardX = width / 2 - cardW / 2;
  let cardY = height * 0.27;

  fill(15, 23, 42);
  stroke(99, 102, 241);
  strokeWeight(3 * scaleFactor);
  rect(cardX, cardY, cardW, cardH, 16 * scaleFactor);

  noStroke();
  fill(148, 163, 184);
  textSize(Math.max(12, 16 * scaleFactor));
  textStyle(NORMAL);
  text("您的最終總得分", width / 2, cardY + cardH * 0.28);

  fill(251, 191, 36);
  textSize(Math.max(28, 44 * scaleFactor));
  textStyle(BOLD);
  text(`${scoreCount} / 100`, width / 2, cardY + cardH * 0.65);

  // 評語
  fill(226, 232, 240);
  textSize(Math.max(13, 18 * scaleFactor));
  textStyle(NORMAL);
  let feedback = "";
  if (scoreCount === 100) {
    feedback = "完全答對！您是真正的數學學霸！💯";
  } else if (scoreCount >= 60) {
    feedback = "表現相當優異！繼續保持！👍";
  } else {
    feedback = "繼續努力，再試一次吧！💪";
  }
  text(feedback, width / 2, height * 0.64);

  // 重新開始按鈕
  let btn = restartButton;
  if (btn.hover) {
    fill(99, 102, 241);
    stroke(165, 180, 252);
  } else {
    fill(79, 70, 229);
    stroke(129, 140, 248);
  }
  strokeWeight(2 * scaleFactor);
  rect(btn.x, btn.y, btn.w, btn.h, btn.h / 2);

  noStroke();
  fill(255);
  textSize(Math.max(14, 19 * scaleFactor));
  textStyle(BOLD);
  text("重新隨機抽題測驗", width / 2, btn.y + btn.h / 2);
}

function updateHoverStates() {
  if (gameState === "QUIZ") {
    for (let btn of optionButtons) {
      btn.hover = mouseX >= btn.x && mouseX <= btn.x + btn.w &&
                  mouseY >= btn.y && mouseY <= btn.y + btn.h;
    }
  } else if (gameState === "END") {
    restartButton.hover = mouseX >= restartButton.x && mouseX <= restartButton.x + restartButton.w &&
                          mouseY >= restartButton.y && mouseY <= restartButton.y + restartButton.h;
  }
}

function mousePressed() {
  if (gameState === "QUIZ") {
    for (let i = 0; i < 4; i++) {
      let btn = optionButtons[i];
      if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
          mouseY >= btn.y && mouseY <= btn.y + btn.h) {
        
        selectedOption = i;
        let isCorrect = (i === quizQuestions[currentQuestion].correct);
        if (isCorrect) {
          scoreCount += Math.round(100 / quizQuestions.length);
        }
        gameState = "FEEDBACK";
        feedbackTimer = millis();
        break;
      }
    }
  } else if (gameState === "END") {
    let btn = restartButton;
    if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
        mouseY >= btn.y && mouseY <= btn.y + btn.h) {
      initQuiz(); // 重新洗牌並抽 5 題
    }
  }
}