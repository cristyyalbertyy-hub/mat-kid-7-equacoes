const equationEl = document.getElementById("equation");
const solutionArea = document.getElementById("solution-area");
const demoArea = document.getElementById("demo-area");
const demoOriginal = document.getElementById("demo-original");
const demoSteps = document.getElementById("demo-steps");
const mainLayout = document.getElementById("main-layout");
const animationArea = document.getElementById("animation-area");
const animationBoard = document.getElementById("animation-board");
const animationLegend = document.getElementById("animation-legend");
const animationSpeedSelect = document.getElementById("animation-speed");
const trainingArea = document.getElementById("training-area");
const trainingBoard = document.getElementById("training-board");
const trainingLegend = document.getElementById("training-legend");
const trainingStats = document.getElementById("training-stats");
const trainingStars = document.getElementById("training-stars");
const trainingHistoryList = document.getElementById("training-history-list");
const tutorModal = document.getElementById("tutor-modal");
const questionsModal = document.getElementById("questions-modal");
const questionsTitle = document.getElementById("questions-title");
const questionsCounter = document.getElementById("questions-counter");
const questionsText = document.getElementById("questions-text");
const questionsAnswer = document.getElementById("questions-answer");
const levelSelect = document.getElementById("level-select");

const btnSolution = document.getElementById("btn-solution");
const btnDemo = document.getElementById("btn-demo");
const btnAnimation = document.getElementById("btn-animation");
const btnAnimationRun = document.getElementById("btn-animation-run");
const btnAnimationReset = document.getElementById("btn-animation-reset");
const btnAnimationExpand = document.getElementById("btn-animation-expand");
const btnTraining = document.getElementById("btn-training");
const btnTrainingReset = document.getElementById("btn-training-reset");
const btnNext = document.getElementById("btn-next");
const btnEnd = document.getElementById("btn-end");
const btnPodcast = document.getElementById("btn-podcast");
const btnVideo = document.getElementById("btn-video");
const btnInfograma = document.getElementById("btn-infograma");
const btnInfograma2 = document.getElementById("btn-infograma-2");
const btnQuestions = document.getElementById("btn-questions");
const btnTutor = document.getElementById("btn-tutor");
const btnTutorClose = document.getElementById("btn-tutor-close");
const btnQuestionsClose = document.getElementById("btn-questions-close");
const btnQuestionPrev = document.getElementById("btn-question-prev");
const btnQuestionNext = document.getElementById("btn-question-next");
const btnQuestionAnswer = document.getElementById("btn-question-answer");

let currentEquation = null;
let demoStepShown = false;
let currentMaxNumber = 9;
let demoLeftTerms = [];
let demoRightTerms = [];
let demoStepCount = 0;
let demoFinalShown = false;
let demoSolutionShown = false;
let animationCharacters = [];
let animationRunning = false;
let animationExpanded = false;
let animationRequiredRows = 1;
let trainingCharacters = [];
let trainingAttempts = 0;
let trainingHits = 0;
let trainingRound = 0;
let trainingCompleted = false;
let trainingHistory = [];
let questionsData = [];
let questionIndex = 0;
let audioCtx = null;

const animationSpeedMap = {
  slow: { startDelay: 1600, crossDuration: 900 },
  normal: { startDelay: 1200, crossDuration: 650 },
  fast: { startDelay: 800, crossDuration: 480 }
};

const levelConfig = {
  easy: 9,
  medium: 20,
  hard: 99
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSign() {
  return randomInt(1, 2) === 1 ? "+" : "-";
}

function randomVX() {
  return randomInt(1, 2) === 1;
}

function generateTerms(parcelCount) {
  const terms = [];
  for (let i = 0; i < parcelCount; i += 1) {
    terms.push({
      n: randomInt(1, currentMaxNumber),
      sign: randomSign(),
      hasX: randomVX()
    });
  }
  return terms;
}

function updateLevelMax() {
  const selected = levelSelect.value;
  currentMaxNumber = levelConfig[selected] || 9;
}

function hasAnyX(terms) {
  return terms.some((term) => term.hasX);
}

function forceAtLeastOneX(leftTerms, rightTerms) {
  if (hasAnyX(leftTerms) || hasAnyX(rightTerms)) {
    return;
  }

  const pickLeft = randomInt(1, 2) === 1;
  const side = pickLeft ? leftTerms : rightTerms;
  const randomIndex = randomInt(0, side.length - 1);
  side[randomIndex].hasX = true;
}

function formatTermText(term) {
  const signal = term.sign === "+" ? "+" : "-";
  return `${signal}${term.n}${term.hasX ? "X" : ""}`;
}

function sideToText(terms) {
  return terms.map(formatTermText).join(" ");
}

function termValue(term) {
  const signedN = term.sign === "+" ? term.n : -term.n;
  return term.hasX ? { x: signedN, c: 0 } : { x: 0, c: signedN };
}

function sumSide(terms) {
  return terms.reduce(
    (acc, term) => {
      const value = termValue(term);
      return { x: acc.x + value.x, c: acc.c + value.c };
    },
    { x: 0, c: 0 }
  );
}

function signedTermHtml(value, withX, moved = false) {
  const sign = value >= 0 ? "+" : "-";
  const absValue = Math.abs(value);
  const text = `${sign}${absValue}${withX ? "X" : ""}`;
  return moved ? `<span class="moved">${text}</span>` : `<span>${text}</span>`;
}

function renderDemoTerms(leftTerms, rightTerms) {
  const leftText = leftTerms.length
    ? leftTerms.map((term) => signedTermHtml(term.value, true, term.moved)).join(" ")
    : "<span>0X</span>";
  const rightText = rightTerms.length
    ? rightTerms.map((term) => signedTermHtml(term.value, false, term.moved)).join(" ")
    : "<span>0</span>";
  return `${leftText} = ${rightText}`;
}

function signedNumberText(value) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value)}`;
}

function renderFinalIsolationHtml(coefX, rightValue) {
  return `X = <span class="fraction"><span class="top">${signedNumberText(rightValue)}</span><span class="bottom">${signedNumberText(coefX)}</span></span>`;
}

function renderSolvedValueHtml(coefX, rightValue) {
  if (coefX === 0) {
    if (rightValue === 0) {
      return "X = qualquer valor (identidade).";
    }
    return "Sem solucao.";
  }
  const solved = rightValue / coefX;
  const formatted = Number.isInteger(solved) ? solved : solved.toFixed(2);
  return `X = ${formatted}`;
}

function prepareDemonstrationTerms(eq) {
  const leftX = [];
  const rightConst = [];

  eq.left.forEach((term) => {
    if (term.hasX) {
      const v = term.sign === "+" ? term.n : -term.n;
      leftX.push({ value: v, moved: false });
    } else {
      const movedV = term.sign === "+" ? -term.n : term.n;
      rightConst.push({ value: movedV, moved: true });
    }
  });

  eq.right.forEach((term) => {
    if (term.hasX) {
      const movedV = term.sign === "+" ? -term.n : term.n;
      leftX.push({ value: movedV, moved: true });
    } else {
      const v = term.sign === "+" ? term.n : -term.n;
      rightConst.push({ value: v, moved: false });
    }
  });

  demoLeftTerms = leftX;
  demoRightTerms = rightConst;
}

function reduceFirstTwoTerms(terms) {
  if (terms.length <= 1) {
    return terms;
  }
  const [first, second, ...rest] = terms;
  const merged = { value: first.value + second.value, moved: false };
  return [merged, ...rest];
}

function canReduceMore() {
  return demoLeftTerms.length > 1 || demoRightTerms.length > 1;
}

function hasNextDemoStep() {
  if (canReduceMore()) {
    return true;
  }
  if (!demoFinalShown && demoLeftTerms.length === 1 && demoRightTerms.length === 1) {
    return true;
  }
  return demoFinalShown && !demoSolutionShown && demoLeftTerms.length === 1 && demoRightTerms.length === 1;
}

function appendDemoRow(equationHtml, showNextButton) {
  demoStepCount += 1;

  const row = document.createElement("div");
  row.className = "demo-row";

  const stepLabel = document.createElement("span");
  stepLabel.className = "step-label";
  stepLabel.textContent = `Passo ${demoStepCount}`;
  row.appendChild(stepLabel);

  const equation = document.createElement("div");
  equation.className = "equation";
  equation.innerHTML = equationHtml;
  row.appendChild(equation);

  if (showNextButton) {
    const btn = document.createElement("button");
    btn.textContent = demoStepShown ? "Mostrar Proximo Passo" : "Mostrar Passo";
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "Mostrado";
      runNextDemoStep();
    });
    row.appendChild(btn);
  } else {
    const end = document.createElement("span");
    end.textContent = "Concluido";
    row.appendChild(end);
  }

  demoSteps.appendChild(row);
}

function runNextDemoStep() {
  if (!demoStepShown) {
    demoStepShown = true;
    prepareDemonstrationTerms(currentEquation);
    appendDemoRow(renderDemoTerms(demoLeftTerms, demoRightTerms), hasNextDemoStep());
    return;
  }

  if (canReduceMore()) {
    demoLeftTerms = reduceFirstTwoTerms(demoLeftTerms);
    demoRightTerms = reduceFirstTwoTerms(demoRightTerms);
    appendDemoRow(renderDemoTerms(demoLeftTerms, demoRightTerms), hasNextDemoStep());
    return;
  }

  if (!demoFinalShown && demoLeftTerms.length === 1 && demoRightTerms.length === 1) {
    demoFinalShown = true;
    appendDemoRow(renderFinalIsolationHtml(demoLeftTerms[0].value, demoRightTerms[0].value), hasNextDemoStep());
    return;
  }

  if (demoFinalShown && !demoSolutionShown && demoLeftTerms.length === 1 && demoRightTerms.length === 1) {
    demoSolutionShown = true;
    appendDemoRow(renderSolvedValueHtml(demoLeftTerms[0].value, demoRightTerms[0].value), false);
  }
}

function renderEquation(eq) {
  equationEl.textContent = `${sideToText(eq.left)} = ${sideToText(eq.right)}`;
}

function invertSign(sign) {
  return sign === "+" ? "-" : "+";
}

function buildAnimationCharacters(eq) {
  const chars = [];
  let idCounter = 1;

  eq.left.forEach((term) => {
    chars.push({
      id: idCounter++,
      startSide: "left",
      currentSide: "left",
      targetSide: term.hasX ? "left" : "right",
      n: term.n,
      baseSign: term.sign,
      sign: term.sign,
      hasX: term.hasX,
      crossed: false
    });
  });

  eq.right.forEach((term) => {
    chars.push({
      id: idCounter++,
      startSide: "right",
      currentSide: "right",
      targetSide: term.hasX ? "left" : "right",
      n: term.n,
      baseSign: term.sign,
      sign: term.sign,
      hasX: term.hasX,
      crossed: false
    });
  });

  return chars;
}

function snowmanHtml(character) {
  return `<div class="snowman" data-id="${character.id}">
    <div class="hat">${character.hasX ? "X" : ""}</div>
    <div class="head">
      <span class="eye left"></span>
      <span class="eye right"></span>
      <span class="nose"></span>
    </div>
    <div class="body">${character.n}</div>
    <div class="sign">${character.sign}</div>
  </div>`;
}

function getLanePositions(boardWidth) {
  const safeRight = Math.max(20, boardWidth - 464);
  return {
    leftLaneX: [20, 110, 200, 290, 380],
    rightLaneX: [safeRight, safeRight + 90, safeRight + 180, safeRight + 270, safeRight + 360],
    rowStart: 30,
    rowGap: 145
  };
}

function placeCharactersBySide(characters) {
  const boardWidth = animationBoard.clientWidth || 900;
  const { leftLaneX, rightLaneX, rowStart, rowGap } = getLanePositions(boardWidth);

  let leftCount = 0;
  let rightCount = 0;
  const currentRows = Math.max(
    Math.ceil(characters.filter((character) => character.currentSide === "left").length / leftLaneX.length),
    Math.ceil(characters.filter((character) => character.currentSide === "right").length / rightLaneX.length),
    1
  );
  const rowsNeeded = Math.max(currentRows, animationRequiredRows);

  // Aumenta automaticamente a altura para acomodar novas linhas de bonecos.
  const dynamicMinHeight = 190 + (rowsNeeded - 1) * rowGap;
  animationBoard.style.minHeight = `${dynamicMinHeight}px`;

  characters.forEach((character) => {
    const el = animationBoard.querySelector(`[data-id="${character.id}"]`);
    if (!el) return;

    if (character.currentSide === "left") {
      const col = leftCount % leftLaneX.length;
      const row = Math.floor(leftCount / leftLaneX.length);
      el.style.left = `${leftLaneX[col]}px`;
      el.style.top = `${rowStart + row * rowGap}px`;
      leftCount += 1;
    } else {
      const col = rightCount % rightLaneX.length;
      const row = Math.floor(rightCount / rightLaneX.length);
      el.style.left = `${rightLaneX[col]}px`;
      el.style.top = `${rowStart + row * rowGap}px`;
      rightCount += 1;
    }
  });
}

function calculateRowsBySide(sideKey, laneSize) {
  const leftCount = animationCharacters.filter((character) => character[sideKey] === "left").length;
  const rightCount = animationCharacters.filter((character) => character[sideKey] === "right").length;
  return Math.max(Math.ceil(leftCount / laneSize), Math.ceil(rightCount / laneSize), 1);
}

function getCharacterTargetPosition(character, leftIndex, rightIndex) {
  const boardWidth = animationBoard.clientWidth || 900;
  const { leftLaneX, rightLaneX, rowStart, rowGap } = getLanePositions(boardWidth);
  if (character.currentSide === "left") {
    return {
      left: leftLaneX[leftIndex % leftLaneX.length],
      top: rowStart + Math.floor(leftIndex / leftLaneX.length) * rowGap
    };
  }
  return {
    left: rightLaneX[rightIndex % rightLaneX.length],
    top: rowStart + Math.floor(rightIndex / rightLaneX.length) * rowGap
  };
}

function renderAnimation(eq) {
  animationCharacters = buildAnimationCharacters(eq);
  animationRequiredRows = Math.max(
    calculateRowsBySide("startSide", 5),
    calculateRowsBySide("targetSide", 5)
  );
  animationBoard.innerHTML = animationCharacters.map((character) => snowmanHtml(character)).join("");
  placeCharactersBySide(animationCharacters);
  animationLegend.textContent = "Clica em \"Iniciar Animacao\" para ver os bonecos atravessar o portao do =.";
  animationRunning = false;
}

function updateTrainingStats() {
  trainingStats.textContent = `Acertos: ${trainingHits} | Tentativas: ${trainingAttempts}`;
}

function renderHistory() {
  if (!trainingHistory.length) {
    trainingHistoryList.innerHTML = "<div class=\"training-history-item\">Sem rondas concluidas ainda.</div>";
    return;
  }
  trainingHistoryList.innerHTML = trainingHistory
    .slice()
    .reverse()
    .map(
      (item) =>
        `<div class="training-history-item">Ronda ${item.round}: ${item.starsText} | Acertos ${item.hits}/${item.attempts}</div>`
    )
    .join("");
}

function calculateStars() {
  const errors = Math.max(trainingAttempts - trainingHits, 0);
  if (errors === 0) return 3;
  if (errors <= 2) return 2;
  return 1;
}

function starsText(stars) {
  return "★".repeat(stars) + "☆".repeat(3 - stars);
}

function parseQuestionsCsv(csvText) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const commaIndex = line.indexOf(",");
      if (commaIndex === -1) {
        return { question: line, answer: "Sem resposta definida." };
      }
      const question = line.slice(0, commaIndex).trim();
      const answer = line.slice(commaIndex + 1).trim();
      return { question, answer };
    });
}

function renderCurrentQuestion() {
  if (!questionsData.length) {
    questionsTitle.textContent = "Sem questoes";
    questionsCounter.textContent = "0 / 0";
    questionsText.textContent = "Nao foi possivel carregar as questoes. Verifica o ficheiro E_Q.csv na pasta public.";
    questionsAnswer.textContent = "";
    questionsAnswer.classList.add("hidden");
    btnQuestionPrev.disabled = true;
    btnQuestionNext.disabled = true;
    btnQuestionAnswer.disabled = true;
    return;
  }

  const current = questionsData[questionIndex];
  questionsTitle.textContent = `Pergunta ${questionIndex + 1}`;
  questionsCounter.textContent = `${questionIndex + 1} / ${questionsData.length}`;
  questionsText.textContent = current.question;
  questionsAnswer.textContent = `Resposta: ${current.answer}`;
  questionsAnswer.classList.add("hidden");
  btnQuestionPrev.disabled = questionIndex === 0;
  btnQuestionNext.disabled = questionIndex === questionsData.length - 1;
  btnQuestionAnswer.disabled = false;
}

async function openQuestionsModal() {
  if (!questionsData.length) {
    const candidateUrls = ["./public/E_Q.csv", "/public/E_Q.csv", "./E_Q.csv", "/E_Q.csv"];
    let loaded = false;
    for (const url of candidateUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }
        const csvText = await response.text();
        const parsed = parseQuestionsCsv(csvText);
        if (parsed.length) {
          questionsData = parsed;
          loaded = true;
          break;
        }
      } catch (error) {
        // Tenta o proximo caminho.
      }
    }
    if (!loaded) {
      questionsData = [];
    }
  }

  questionIndex = 0;
  renderCurrentQuestion();
  questionsModal.classList.remove("hidden");
}

function placeTrainingCharacters() {
  const boardWidth = trainingBoard.clientWidth || 900;
  const { leftLaneX, rightLaneX, rowStart, rowGap } = getLanePositions(boardWidth);
  let leftCount = 0;
  let rightCount = 0;
  const rowsNeeded = Math.max(
    Math.ceil(trainingCharacters.filter((character) => character.currentSide === "left").length / leftLaneX.length),
    Math.ceil(trainingCharacters.filter((character) => character.currentSide === "right").length / rightLaneX.length),
    1
  );
  trainingBoard.style.minHeight = `${190 + (rowsNeeded - 1) * rowGap}px`;

  trainingCharacters.forEach((character) => {
    const el = trainingBoard.querySelector(`[data-id="${character.id}"]`);
    if (!el) return;
    if (character.currentSide === "left") {
      const col = leftCount % leftLaneX.length;
      const row = Math.floor(leftCount / leftLaneX.length);
      el.style.left = `${leftLaneX[col]}px`;
      el.style.top = `${rowStart + row * rowGap}px`;
      leftCount += 1;
    } else {
      const col = rightCount % rightLaneX.length;
      const row = Math.floor(rightCount / rightLaneX.length);
      el.style.left = `${rightLaneX[col]}px`;
      el.style.top = `${rowStart + row * rowGap}px`;
      rightCount += 1;
    }
  });
}

function isTrainingFinished() {
  return trainingCharacters.every((character) => character.currentSide === character.targetSide);
}

function handleTrainingClick(characterId) {
  const character = trainingCharacters.find((item) => item.id === characterId);
  if (!character || trainingCompleted) return;

  trainingAttempts += 1;
  if (character.currentSide === character.targetSide) {
    trainingLegend.textContent = "Esse boneco ja esta no lado certo. Tenta outro.";
    updateTrainingStats();
    return;
  }

  trainingHits += 1;
  character.currentSide = character.targetSide;
  character.sign = invertSign(character.sign);
  character.crossed = true;

  const signEl = trainingBoard.querySelector(`[data-id="${character.id}"] .sign`);
  if (signEl) {
    signEl.textContent = character.sign;
    signEl.classList.add("changed");
  }

  placeTrainingCharacters();
  if (isTrainingFinished()) {
    const stars = calculateStars();
    const currentStars = starsText(stars);
    trainingStars.textContent = `Estrelas: ${currentStars}`;
    trainingLegend.textContent = "Parabens! Terminaste o treino guiado.";
    trainingCompleted = true;
    trainingHistory.push({
      round: trainingRound,
      starsText: currentStars,
      hits: trainingHits,
      attempts: trainingAttempts
    });
    renderHistory();
  } else {
    trainingLegend.textContent = `Correto! ${character.n}${character.hasX ? "X" : ""} movido com troca de sinal.`;
  }
  updateTrainingStats();
}

function renderTraining(eq) {
  trainingCharacters = buildAnimationCharacters(eq);
  trainingRound += 1;
  trainingAttempts = 0;
  trainingHits = 0;
  trainingCompleted = false;
  trainingLegend.textContent = "Clica num boneco para o mover para o lado correto.";
  trainingStars.textContent = "Estrelas: ☆☆☆";
  updateTrainingStats();
  renderHistory();
  trainingBoard.innerHTML = trainingCharacters.map((character) => snowmanHtml(character)).join("");
  trainingBoard.querySelectorAll(".snowman").forEach((node) => {
    const id = Number(node.getAttribute("data-id"));
    node.addEventListener("click", () => handleTrainingClick(id));
  });
  placeTrainingCharacters();
}

function toggleAnimationExpanded() {
  animationExpanded = !animationExpanded;
  mainLayout.classList.toggle("animation-expanded", animationExpanded);
  btnAnimationExpand.textContent = animationExpanded ? "Reduzir Janela" : "Expandir Janela";
  if (animationCharacters.length) {
    placeCharactersBySide(animationCharacters);
  }
}

function setLegend(text) {
  animationLegend.textContent = text;
}

function resetAnimationState() {
  animationBoard.querySelectorAll(".footprint").forEach((mark) => mark.remove());
  animationCharacters.forEach((character) => {
    character.currentSide = character.startSide;
    character.sign = character.baseSign;
    character.crossed = false;
    const snowman = animationBoard.querySelector(`[data-id="${character.id}"]`);
    if (!snowman) return;
    snowman.classList.remove("crossing");
    const signEl = snowman.querySelector(".sign");
    if (signEl) {
      signEl.textContent = character.sign;
      signEl.classList.remove("changed");
    }
  });
  placeCharactersBySide(animationCharacters);
}

function getAnimationTiming() {
  const speed = animationSpeedSelect.value || "normal";
  return animationSpeedMap[speed] || animationSpeedMap.normal;
}

function addFootprintsAtGate() {
  const boardWidth = animationBoard.clientWidth || 900;
  const gateCenter = boardWidth / 2;
  const boardHeight = animationBoard.clientHeight || 280;
  const y = Math.max(90, Math.random() * (boardHeight - 40));
  for (let i = 0; i < 3; i += 1) {
    const mark = document.createElement("span");
    mark.className = "footprint";
    mark.style.left = `${gateCenter + (i - 1) * 10}px`;
    mark.style.top = `${y + i * 5}px`;
    animationBoard.appendChild(mark);
    setTimeout(() => mark.remove(), 2200);
  }
}

function playSignSwapSound() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }

  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 660;
  gain.gain.value = 0.001;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

function runAnimation() {
  if (animationRunning) return;
  animationRunning = true;
  resetAnimationState();
  const timing = getAnimationTiming();

  const crossing = animationCharacters.filter((character) => character.startSide !== character.targetSide);
  if (!crossing.length) {
    setLegend("Nenhum boneco atravessou o portao nesta equacao. Todos ja estavam no lado certo.");
    animationRunning = false;
    return;
  }

  crossing.forEach((character, index) => {
    setTimeout(() => {
      setLegend(`Boneco ${character.sign}${character.n}${character.hasX ? "X" : ""} atravessou o portao e vai trocar o sinal.`);
      const snowman = animationBoard.querySelector(`[data-id="${character.id}"]`);
      if (snowman) {
        snowman.classList.add("crossing");
      }

      const gateLeft = (animationBoard.clientWidth || 900) / 2 - 42;
      if (snowman) {
        snowman.style.left = `${gateLeft}px`;
      }
    }, index * timing.startDelay);

    setTimeout(() => {
      character.currentSide = character.targetSide;
      character.crossed = true;
      character.sign = invertSign(character.sign);
      addFootprintsAtGate();
      playSignSwapSound();

      let leftIndex = 0;
      let rightIndex = 0;
      animationCharacters.forEach((item) => {
        const position = getCharacterTargetPosition(item, leftIndex, rightIndex);
        const elSnowman = animationBoard.querySelector(`[data-id="${item.id}"]`);
        if (elSnowman) {
          elSnowman.style.left = `${position.left}px`;
          elSnowman.style.top = `${position.top}px`;
          if (item.id === character.id) {
            const elSign = elSnowman.querySelector(".sign");
            if (elSign) {
              elSign.textContent = item.sign;
              elSign.classList.add("changed");
            }
            elSnowman.classList.remove("crossing");
          }
        }
        if (item.currentSide === "left") {
          leftIndex += 1;
        } else {
          rightIndex += 1;
        }
      });

      if (index === crossing.length - 1) {
        setLegend("Animacao concluida: quem atravessou o portao mudou de sinal (a vermelho).");
        animationRunning = false;
      }
    }, index * timing.startDelay + timing.crossDuration);
  });
}

function computeSolution(eq) {
  const left = sumSide(eq.left);
  const right = sumSide(eq.right);

  const coefX = left.x - right.x;
  const constSide = right.c - left.c;

  if (coefX === 0 && constSide === 0) {
    return "Infinitas solucoes (identidade).";
  }
  if (coefX === 0 && constSide !== 0) {
    return "Sem solucao (contradicao).";
  }

  const value = constSide / coefX;
  const formatted = Number.isInteger(value) ? value : value.toFixed(2);
  return `x = ${formatted}`;
}

function newQuestion() {
  const p1 = randomInt(1, 5);
  const p2 = randomInt(1, 5);
  const leftTerms = generateTerms(p1);
  const rightTerms = generateTerms(p2);

  // Garante que a pergunta tem pelo menos um termo com X.
  forceAtLeastOneX(leftTerms, rightTerms);

  currentEquation = {
    p1,
    p2,
    left: leftTerms,
    right: rightTerms
  };

  renderEquation(currentEquation);
  solutionArea.classList.add("hidden");
  demoArea.classList.add("hidden");
  animationArea.classList.add("hidden");
  trainingArea.classList.add("hidden");
  demoSteps.innerHTML = "";
  demoStepShown = false;
  demoLeftTerms = [];
  demoRightTerms = [];
  demoStepCount = 0;
  demoFinalShown = false;
  demoSolutionShown = false;
  animationCharacters = [];
  animationRequiredRows = 1;
  trainingCharacters = [];
  trainingAttempts = 0;
  trainingHits = 0;
  trainingRound = 0;
  trainingCompleted = false;
  trainingHistory = [];
  animationBoard.innerHTML = "";
  trainingBoard.innerHTML = "";
  trainingStars.textContent = "Estrelas: ☆☆☆";
  trainingHistoryList.innerHTML = "";
  animationRunning = false;
  animationExpanded = false;
  mainLayout.classList.remove("animation-expanded");
  btnAnimationExpand.textContent = "Expandir Janela";
  setLegend("Clica em \"Iniciar Animacao\" para ver os bonecos atravessar o portao do =.");
}

btnSolution.addEventListener("click", () => {
  if (!currentEquation) return;
  solutionArea.classList.remove("hidden");
  solutionArea.textContent = computeSolution(currentEquation);
});

btnDemo.addEventListener("click", () => {
  if (!currentEquation) return;
  demoArea.classList.remove("hidden");
  demoOriginal.textContent = `${sideToText(currentEquation.left)} = ${sideToText(currentEquation.right)}`;
  if (demoSteps.children.length === 0) {
    runNextDemoStep();
  }
});

btnAnimation.addEventListener("click", () => {
  if (!currentEquation) return;
  animationArea.classList.remove("hidden");
  renderAnimation(currentEquation);
});

btnAnimationRun.addEventListener("click", () => {
  if (!currentEquation || animationCharacters.length === 0) return;
  runAnimation();
});

btnAnimationReset.addEventListener("click", () => {
  if (!currentEquation) return;
  renderAnimation(currentEquation);
});

btnTraining.addEventListener("click", () => {
  if (!currentEquation) return;
  trainingArea.classList.remove("hidden");
  renderTraining(currentEquation);
});

btnTrainingReset.addEventListener("click", () => {
  if (!currentEquation) return;
  renderTraining(currentEquation);
});

btnAnimationExpand.addEventListener("click", () => {
  toggleAnimationExpanded();
});

btnNext.addEventListener("click", () => {
  newQuestion();
});

btnEnd.addEventListener("click", () => {
  equationEl.textContent = "Fim da atividade. Obrigado por aprenderes com a MAT KID 7!";
  solutionArea.classList.add("hidden");
  demoArea.classList.add("hidden");
});

btnPodcast.addEventListener("click", () => {
  const podcastUrl = "./public/E_P.m4a";
  const opened = window.open(podcastUrl, "_blank");
  if (!opened) {
    window.alert("Nao foi possivel abrir o podcast. Verifica se o ficheiro existe em public/E_P.m4a.");
  }
});

btnVideo.addEventListener("click", () => {
  const videoUrl = "./public/E_V.mp4";
  const opened = window.open(videoUrl, "_blank");
  if (!opened) {
    window.alert("Nao foi possivel abrir o video. Verifica se o ficheiro existe em public/E_V.mp4.");
  }
});

btnInfograma.addEventListener("click", () => {
  const infogramaUrl = "./public/E_I.png";
  const opened = window.open(infogramaUrl, "_blank");
  if (!opened) {
    window.alert("Nao foi possivel abrir o infograma. Verifica se o ficheiro existe em public/E_I.png.");
  }
});

btnInfograma2.addEventListener("click", () => {
  const infogramaUrl = "./public/E_I2.png";
  const opened = window.open(infogramaUrl, "_blank");
  if (!opened) {
    window.alert("Nao foi possivel abrir o infograma. Verifica se o ficheiro existe em public/E_I2.png.");
  }
});

btnQuestions.addEventListener("click", () => {
  openQuestionsModal();
});

btnTutor.addEventListener("click", () => {
  tutorModal.classList.remove("hidden");
});

btnTutorClose.addEventListener("click", () => {
  tutorModal.classList.add("hidden");
});

btnQuestionsClose.addEventListener("click", () => {
  questionsModal.classList.add("hidden");
});

btnQuestionPrev.addEventListener("click", () => {
  if (questionIndex > 0) {
    questionIndex -= 1;
    renderCurrentQuestion();
  }
});

btnQuestionNext.addEventListener("click", () => {
  if (questionIndex < questionsData.length - 1) {
    questionIndex += 1;
    renderCurrentQuestion();
  }
});

btnQuestionAnswer.addEventListener("click", () => {
  questionsAnswer.classList.remove("hidden");
});

levelSelect.addEventListener("change", () => {
  updateLevelMax();
  newQuestion();
});

updateLevelMax();
newQuestion();
