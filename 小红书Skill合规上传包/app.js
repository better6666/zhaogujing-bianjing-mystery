(function () {
  "use strict";

  var root = document.getElementById("root");
  if (!root) return;

  var state = {
    scene: "cover",
    bagOpen: false,
    sourcesOpen: false,
    found: [],
    light: { x: 50, y: 50 },
    toneInput: [],
    soundState: "idle",
    soundAttempts: 0,
    activeTone: "",
    rubbed: [],
    rubbing: false,
    suspect: "",
    reason: ""
  };

  var audioContext = null;
  var visualTimers = [];
  var targetSequence = ["jade", "wood", "bronze", "jade"];
  var toneNames = { jade: "清", wood: "暖", bronze: "沉" };
  var toneLabels = { jade: "玉磬", wood: "木鼓", bronze: "铜钲" };
  var tileText = ["湖", "州", "石", "家", "青", "铜", "照", "子", "客", "来", "如", "意"];
  var targets = [
    { id: "feather", x: 73, y: 34 },
    { id: "wax", x: 28, y: 68 },
    { id: "crack", x: 52, y: 78 }
  ];
  var clues = {
    feather: { mark: "羽", title: "磨损的双羽纹", note: "右上方的羽尖有反复摩擦痕迹，不像自然锈蚀。" },
    wax: { mark: "火", title: "镜缘的朱色旧漆", note: "一小片朱漆卡在镜缘，可能来自收纳镜的木匣。" },
    crack: { mark: "裂", title: "二次打磨的裂口", note: "裂口被人耐心磨平，镜子损坏后仍长期使用。" },
    rhythm: { mark: "声", title: "四声曲牌暗号", note: "“清—暖—沉—清”与瓦舍后场常用的催场节奏相似。" },
    inscription: { mark: "石", title: "“湖州石家”作坊铭", note: "铭文说明铸造来处，却不能直接证明使用者身份。" }
  };
  var suspects = [
    { id: "musician", name: "沈七娘", role: "瓦舍笛伎", claim: "“镜子是我的。羽纹是登台前摸出来的。”", mark: "羽" },
    { id: "maker", name: "石安", role: "湖州镜匠", claim: "“镜背有我家字号，它自然属于石家。”", mark: "石" },
    { id: "merchant", name: "卢生", role: "汴洛行商", claim: "“朱漆是我的货匣留下的，我带它走过很远。”", mark: "路" }
  ];

  function evidence() {
    var list = state.found.map(function (id) { return clues[id]; });
    if (state.soundState === "solved") list.push(clues.rhythm);
    if (state.rubbed.length >= 9) list.push(clues.inscription);
    return list;
  }

  function clearVisualTimers() {
    visualTimers.forEach(function (id) { window.clearTimeout(id); });
    visualTimers = [];
  }

  function ensureAudio() {
    var AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function scheduleNote(tone, delayMs) {
    var ctx = ensureAudio();
    var delay = delayMs || 0;
    if (ctx) {
      var startAt = ctx.currentTime + delay / 1000;
      var oscillator = ctx.createOscillator();
      var gain = ctx.createGain();
      oscillator.frequency.value = { jade: 784, wood: 392, bronze: 196 }[tone];
      oscillator.type = tone === "bronze" ? "sine" : "triangle";
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.55);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.58);
    }
    visualTimers.push(window.setTimeout(function () {
      state.activeTone = tone;
      updateSoundVisuals();
    }, delay));
    visualTimers.push(window.setTimeout(function () {
      state.activeTone = "";
      updateSoundVisuals();
    }, delay + 420));
  }

  function scoreValue() {
    return Math.max(0, Math.min(100,
      35 + state.found.length * 10 +
      (state.soundState === "solved" ? 18 : 0) +
      Math.min(12, state.rubbed.length) +
      (state.suspect === "musician" ? 18 : 4) -
      Math.max(0, state.soundAttempts - 1) * 3
    ));
  }

  function endingData() {
    var score = scoreValue();
    if (state.suspect === "musician") {
      return {
        title: "镜归七娘",
        rank: score >= 90 ? "特级照骨官" : "汴京寻物人",
        text: "你没被“石家”二字带走。作坊铭只能说明镜子在哪里制作，双羽的摩损和催场节奏才指向它长期陪伴的人。"
      };
    }
    if (state.suspect === "maker") {
      return { title: "铭文的误导", rank: "作坊追迹者", text: "你找对了镜子的出生地，却把制造者当成了使用者。镜子会经过商贩、赠送和转卖，铭文不等于物权证明。" };
    }
    return { title: "旅痕与主人", rank: "行迹采集者", text: "你捕捉到镜子的流转痕迹，但货匣只证明它被运送过。真正的长期使用痕迹，藏在人手总会碰到的羽纹上。" };
  }

  function headerHtml() {
    var validateActive = ["light", "sound", "rubbing", "deduction", "ending"].indexOf(state.scene) >= 0;
    var finishActive = ["deduction", "ending"].indexOf(state.scene) >= 0;
    return '<header class="topbar game-topbar">' +
      '<button class="brand" data-action="restart"><span class="seal">鉴</span><span>照骨镜<small>汴京失物案</small></span></button>' +
      '<div class="case-progress"><span class="' + (state.scene !== "cover" ? "active" : "") + '">入档</span><i></i>' +
      '<span class="' + (validateActive ? "active" : "") + '">验物</span><i></i><span class="' + (finishActive ? "active" : "") + '">结案</span></div>' +
      '<div class="header-actions"><button class="evidence-button" data-action="bag">证物袋 <b>' + evidence().length + '</b></button>' +
      '<button class="source-link" data-action="sources">史实与出处</button></div></header>';
  }

  function coverHtml() {
    return '<section class="hero case-cover scene-panel"><div class="case-stamp">1122<br><small>宣和四年</small></div>' +
      '<p class="eyebrow">开封府失物档 · 第 007 号</p><h1>一面镜子<br><em>三个都说是它的人</em></h1>' +
      '<p class="intro">汴京州桥下捡到一面破镜。镜匠、行商与瓦舍乐工同时前来认领。<br>你只有一盏灯的时间，找出它真正记得的人。</p>' +
      '<div class="case-object"><div class="halo"></div><div class="mirror static-mirror"><span class="mirror-ring ring-one"></span><span class="mirror-ring ring-two"></span><span class="mirror-heart">玄</span><span class="hidden-mark">羽</span></div>' +
      '<div class="evidence-tags"><span>裂口</span><span>朱漆</span><span>暗纹</span></div></div>' +
      '<button class="primary" data-scene="briefing"><span>接下这宗奇案</span><b>→</b></button>' +
      '<div class="game-stats"><span>约 3 分钟</span><span>3 种操作</span><span>多结局</span><span>可重玩</span></div></section>';
  }

  function briefingHtml() {
    return '<section class="briefing scene-panel"><div class="brief-card"><p class="eyebrow">开封府快报</p>' +
      '<h2>镜主人失踪的第七日</h2><p>拾镜人说，镜子被布包着放在州桥河阶下。布早已被水冲走，镜背却留下三处可疑痕迹。</p>' +
      '<blockquote>“别问镜子照见过谁，问它被谁摸过千万遍。”</blockquote><div class="brief-rules">' +
      '<div><b>01</b><span>移灯找到 3 处痕迹</span></div><div><b>02</b><span>记住镜体的 4 声回响</span></div><div><b>03</b><span>拓出被锈蚀遮住的铭文</span></div></div>' +
      '<button class="primary" data-scene="light"><span>提灯入库</span><b>→</b></button></div></section>';
  }

  function lightHtml() {
    var foundList = targets.map(function (target) {
      var found = state.found.indexOf(target.id) >= 0;
      return '<span class="' + (found ? "found" : "") + '">' + (found ? clues[target.id].title : "未知痕迹") + '</span>';
    }).join("");
    var cluePoints = targets.map(function (target) {
      var found = state.found.indexOf(target.id) >= 0;
      return '<span class="clue-point ' + target.id + ' ' + (found ? "revealed" : "") + '" style="left:' + target.x + '%;top:' + target.y + '%">' + clues[target.id].mark + '</span>';
    }).join("");
    var remaining = 3 - state.found.length;
    return '<section class="quest scene-panel"><div class="quest-copy"><p class="eyebrow">01 · 光检</p><h2>别让灯火<br>只照在正面</h2>' +
      '<p>拖动灯光检查整面镜背。三处异样的材质会在光下显形，找到后自动装入证物袋。</p>' +
      '<div class="mini-goal"><b>当前目标</b><span>' + state.found.length + '/3 处痕迹</span></div><div class="found-list">' + foundList + '</div></div>' +
      '<div class="play-card light-card" data-stage="light"><div class="large-mirror investigation-mirror"><span class="petals">卌</span>' + cluePoints + '</div>' +
      '<div class="cursor-light" style="left:' + state.light.x + '%;top:' + state.light.y + '%"><i></i></div>' +
      '<div class="oil-meter"><span>灯油</span><i><b style="width:' + (100 - state.found.length * 18) + '%"></b></i><small>' + (remaining ? "慢一点，贴近镜缘" : "证物齐全") + '</small></div></div>' +
      '<button class="primary next" data-scene="sound" ' + (remaining ? "disabled" : "") + '><span>' + (remaining ? "还差 " + remaining + " 处痕迹" : "转入听音台") + '</span><b>→</b></button></section>';
  }

  function soundHtml() {
    var slots = targetSequence.map(function (_, index) {
      var tone = state.toneInput[index] || "";
      return '<span class="' + tone + '">' + (tone ? toneNames[tone] : index + 1) + '</span>';
    }).join("");
    var tones = ["jade", "wood", "bronze"].map(function (tone) {
      var symbol = tone === "jade" ? "◇" : tone === "wood" ? "丶" : "●";
      var disabled = state.soundState === "playing" || state.soundState === "solved";
      return '<button data-tone="' + tone + '" ' + (disabled ? "disabled" : "") + '><span class="tone-object ' + tone + '">' + symbol + '</span><b>' + toneLabels[tone] + '</b><small>' + toneNames[tone] + '</small></button>';
    }).join("");
    var hint = state.soundState === "wrong" ? "线索断了，再听一次" : state.soundState === "solved" ? "新证物：四声曲牌暗号" : "注意第一声与最后一声";
    var coreText = state.soundState === "playing" ? "正在回放…" : state.soundState === "wrong" ? "顺序不对" : state.soundState === "solved" ? "四声重合" : "等待听音";
    var listenDisabled = state.soundState === "playing" || state.soundState === "solved";
    return '<section class="quest scene-panel"><div class="quest-copy"><p class="eyebrow">02 · 听证</p><h2>镜子被敲了<br>四下</h2>' +
      '<p>先点击“听回响”，再用三种器物复现顺序。戴上耳机会更容易分辨高低。</p><div class="mini-goal"><b>侦听记录</b><span>尝试 ' + state.soundAttempts + ' 次</span></div><div class="sound-slots">' + slots + '</div></div>' +
      '<div class="play-card memory-card ' + state.soundState + '"><div class="echo-core"><i class="' + state.activeTone + '"></i><span>' + coreText + '</span></div>' +
      '<button class="listen-button" data-action="listen" ' + (listenDisabled ? "disabled" : "") + '>◎ ' + (state.soundAttempts ? "再听一次" : "听回响") + '</button>' +
      '<div class="tone-grid memory-tones">' + tones + '</div><p class="memory-hint">' + hint + '</p></div>' +
      '<button class="primary next" data-scene="rubbing" ' + (state.soundState === "solved" ? "" : "disabled") + '><span>' + (state.soundState === "solved" ? "带着节奏去拓印" : "复现正确顺序") + '</span><b>→</b></button></section>';
  }

  function rubbingHtml() {
    var tiles = tileText.map(function (text, index) {
      var rubbed = state.rubbed.indexOf(index) >= 0;
      return '<button aria-label="拓印第 ' + (index + 1) + ' 区" data-tile="' + index + '" class="' + (rubbed ? "rubbed" : "") + '"><span>' + text + '</span></button>';
    }).join("");
    var remaining = Math.max(0, 9 - state.rubbed.length);
    return '<section class="quest scene-panel"><div class="quest-copy"><p class="eyebrow">03 · 拓铭</p><h2>一个字号<br>不等于一个主人</h2>' +
      '<p>按住纸面并来回擦拭，至少拓出 9 块才能读完铭文。漏掉的地方可能正是关键。</p><div class="mini-goal"><b>拓印完成度</b><span class="rub-count">' + state.rubbed.length + '/12 区</span></div>' +
      '<div class="rub-legend"><span>作坊？</span><span>时间？</span><span>主人？</span></div></div>' +
      '<div class="play-card grid-rubbing-card"><div class="rubbing-sheet" data-stage="rubbing">' + tiles + '</div>' +
      '<div class="rub-progress"><i><b style="width:' + (state.rubbed.length / 12 * 100) + '%"></b></i><span>' + (state.rubbed.length >= 9 ? "铭文可读：湖州石家青铜照子" : "按住拓纸，划过空白区域") + '</span></div></div>' +
      '<button class="primary next" data-scene="deduction" ' + (remaining ? "disabled" : "") + '><span>' + (remaining ? "还需拓出 " + remaining + " 区" : "召集三人对质") + '</span><b>→</b></button></section>';
  }

  function deductionHtml() {
    var cards = suspects.map(function (person) {
      var selected = state.suspect === person.id;
      return '<button data-suspect="' + person.id + '" class="' + (selected ? "selected" : "") + '"><span class="suspect-mark">' + person.mark + '</span><small>' + person.role + '</small><h3>' + person.name + '</h3><blockquote>' + person.claim + '</blockquote><i>' + (selected ? "已锁定" : "点击询问") + '</i></button>';
    }).join("");
    var reasons = evidence().map(function (item) {
      return '<button data-reason="' + item.title + '" class="' + (state.reason === item.title ? "selected" : "") + '">' + item.mark + ' · ' + item.title + '</button>';
    }).join("");
    return '<section class="deduction scene-panel"><div class="deduction-head"><p class="eyebrow">最终推理</p><h2>作坊铭、运输痕和使用痕<br><em>哪一种最能证明“属于”？</em></h2>' +
      '<p>选一位镜主人，再指出你最信任的证物。一旦落印，本案将记入你的鉴物档。</p></div><div class="suspect-grid">' + cards + '</div>' +
      '<div class="reason-panel"><span>我最信任的证物</span><div>' + reasons + '</div></div>' +
      '<button class="primary verdict" data-scene="ending" ' + (state.suspect && state.reason ? "" : "disabled") + '><span>落下结案印</span><b>鉴</b></button></section>';
  }

  function endingHtml() {
    var ending = endingData();
    var score = scoreValue();
    var person = suspects.filter(function (item) { return item.id === state.suspect; })[0];
    var seal = state.suspect === "musician" ? "归" : state.suspect === "maker" ? "误" : "迹";
    return '<section class="ending scene-panel ' + (state.suspect === "musician" ? "true-ending" : "") + '"><div class="ending-card">' +
      '<div class="score-ring" style="--score:' + (score * 3.6) + 'deg"><span>' + score + '</span><small>鉴物分</small></div><p class="eyebrow">汴京失物案 · 已结</p>' +
      '<h2>' + ending.title + '</h2><div class="ending-seal">' + seal + '</div><p>' + ending.text + '</p><blockquote>你的鉴物称号：<b>' + ending.rank + '</b></blockquote>' +
      '<div class="ending-evidence"><span>你选择了 ' + person.name + '</span><span>关键证物：' + state.reason + '</span><span>听音尝试：' + state.soundAttempts + ' 次</span></div></div>' +
      '<div class="ending-actions"><button class="primary" data-action="restart"><span>换一种推理重开</span><b>↻</b></button><button class="ghost" data-action="bag">复盘全部证物</button></div>' +
      '<p class="disclaimer">“玄羽镜”、人物与失物案为虚构；铜镜作坊铭、纹饰与拓片知识参考博物馆公开资料。</p></section>';
  }

  function modalHtml() {
    var html = "";
    if (state.bagOpen) {
      var items = evidence();
      var list = items.map(function (item, index) {
        return '<article><span>' + item.mark + '</span><div><small>证物 0' + (index + 1) + '</small><h3>' + item.title + '</h3><p>' + item.note + '</p></div></article>';
      }).join("");
      html += '<div class="modal-backdrop" data-modal="bag"><aside class="sources evidence-drawer" role="dialog" aria-modal="true" aria-label="证物袋"><button class="close" data-close="bag">×</button>' +
        '<p class="eyebrow">开封府 · 第 007 号证物袋</p><h2>' + (items.length ? "已收集 " + items.length + "/5" : "还没有证物") + '</h2><div class="evidence-list">' + list + '</div>' +
        (items.length ? "" : "<p>提灯检查镜背后，线索会自动装入这里。</p>") + '</aside></div>';
    }
    if (state.sourcesOpen) {
      html += '<div class="modal-backdrop" data-modal="sources"><aside class="sources" role="dialog" aria-modal="true" aria-label="史实与出处"><button class="close" data-close="sources">×</button>' +
        '<p class="eyebrow">史实边界</p><h2>这不是一面真实馆藏镜</h2><p>宋代铜镜的形制、镜钮、纹饰、作坊铭记以及拓片研究方法有公开馆藏资料可考。“玄羽镜”、沈七娘等人物、宣和四年失物案及所有对话均为虚构。</p>' +
        '<h3>核心参考</h3><ol><li><span>上海博物馆：馆藏铜镜展览资料</span></li><li><span>故宫博物院：《故宫藏镜》</span></li><li><span>中国国家博物馆：双凤流云纹铜镜</span></li><li><span>故宫博物院：犀照群伦—故宫藏历代铜镜展</span></li></ol>' +
        '<p class="source-note">作品中“四声曲牌暗号”为游戏机制，不是历史考证结论。</p></aside></div>';
    }
    return html;
  }

  function sceneHtml() {
    if (state.scene === "cover") return coverHtml();
    if (state.scene === "briefing") return briefingHtml();
    if (state.scene === "light") return lightHtml();
    if (state.scene === "sound") return soundHtml();
    if (state.scene === "rubbing") return rubbingHtml();
    if (state.scene === "deduction") return deductionHtml();
    return endingHtml();
  }

  function render() {
    root.innerHTML = '<main class="shell game-shell scene-' + state.scene + '"><div class="grain" aria-hidden="true"></div>' + headerHtml() + sceneHtml() + modalHtml() + '</main>';
    bindEvents();
  }

  function restart() {
    clearVisualTimers();
    state.scene = "cover";
    state.bagOpen = false;
    state.sourcesOpen = false;
    state.found = [];
    state.light = { x: 50, y: 50 };
    state.toneInput = [];
    state.soundState = "idle";
    state.soundAttempts = 0;
    state.activeTone = "";
    state.rubbed = [];
    state.rubbing = false;
    state.suspect = "";
    state.reason = "";
    render();
  }

  function updateSoundVisuals() {
    var core = root.querySelector(".echo-core i");
    if (core) core.className = state.activeTone;
  }

  function playSequence() {
    if (state.soundState === "playing" || state.soundState === "solved") return;
    clearVisualTimers();
    ensureAudio();
    state.toneInput = [];
    state.soundState = "playing";
    render();
    targetSequence.forEach(function (tone, index) { scheduleNote(tone, index * 650); });
    visualTimers.push(window.setTimeout(function () {
      state.soundState = "idle";
      state.activeTone = "";
      render();
    }, targetSequence.length * 650 + 150));
  }

  function tapTone(tone) {
    if (state.soundState === "playing" || state.soundState === "solved") return;
    ensureAudio();
    scheduleNote(tone, 0);
    state.toneInput = state.toneInput.concat(tone);
    if (state.toneInput.length === targetSequence.length) {
      state.soundAttempts += 1;
      var correct = state.toneInput.every(function (item, index) { return item === targetSequence[index]; });
      state.soundState = correct ? "solved" : "wrong";
      if (!correct) {
        visualTimers.push(window.setTimeout(function () {
          state.toneInput = [];
          state.soundState = "idle";
          render();
        }, 900));
      }
    }
    render();
  }

  function moveLight(event, stage) {
    var rect = stage.getBoundingClientRect();
    var x = Math.max(4, Math.min(96, (event.clientX - rect.left) / rect.width * 100));
    var y = Math.max(4, Math.min(94, (event.clientY - rect.top) / rect.height * 100));
    state.light = { x: x, y: y };
    var cursor = stage.querySelector(".cursor-light");
    if (cursor) {
      cursor.style.left = x + "%";
      cursor.style.top = y + "%";
    }
    var changed = false;
    targets.forEach(function (target) {
      var marker = stage.querySelector(".clue-point." + target.id);
      if (!marker) return;
      var markerRect = marker.getBoundingClientRect();
      var markerX = markerRect.left + markerRect.width / 2;
      var markerY = markerRect.top + markerRect.height / 2;
      var hitRadius = Math.max(30, Math.min(rect.width, rect.height) * 0.09);
      var distance = Math.hypot(event.clientX - markerX, event.clientY - markerY);
      if (distance < hitRadius && state.found.indexOf(target.id) < 0) {
        state.found.push(target.id);
        changed = true;
      }
    });
    if (changed) render();
  }

  function revealTile(button) {
    var index = Number(button.getAttribute("data-tile"));
    if (state.rubbed.indexOf(index) >= 0) return;
    state.rubbed.push(index);
    button.classList.add("rubbed");
    var count = root.querySelector(".rub-count");
    var bar = root.querySelector(".rub-progress b");
    var text = root.querySelector(".rub-progress span");
    var next = root.querySelector('[data-scene="deduction"]');
    if (count) count.textContent = state.rubbed.length + "/12 区";
    if (bar) bar.style.width = state.rubbed.length / 12 * 100 + "%";
    if (text && state.rubbed.length >= 9) text.textContent = "铭文可读：湖州石家青铜照子";
    if (next && state.rubbed.length >= 9) {
      next.disabled = false;
      var label = next.querySelector("span");
      if (label) label.textContent = "召集三人对质";
    } else if (next) {
      var nextLabel = next.querySelector("span");
      if (nextLabel) nextLabel.textContent = "还需拓出 " + (9 - state.rubbed.length) + " 区";
    }
  }

  function bindEvents() {
    root.querySelectorAll("[data-scene]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.disabled) return;
        state.scene = button.getAttribute("data-scene");
        state.bagOpen = false;
        state.sourcesOpen = false;
        render();
      });
    });
    root.querySelectorAll('[data-action="restart"]').forEach(function (button) { button.addEventListener("click", restart); });
    root.querySelectorAll('[data-action="bag"]').forEach(function (button) { button.addEventListener("click", function () { state.bagOpen = true; render(); }); });
    root.querySelectorAll('[data-action="sources"]').forEach(function (button) { button.addEventListener("click", function () { state.sourcesOpen = true; render(); }); });
    root.querySelectorAll('[data-close="bag"]').forEach(function (button) { button.addEventListener("click", function () { state.bagOpen = false; render(); }); });
    root.querySelectorAll('[data-close="sources"]').forEach(function (button) { button.addEventListener("click", function () { state.sourcesOpen = false; render(); }); });
    root.querySelectorAll("[data-modal]").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (event) {
        if (event.target !== backdrop) return;
        if (backdrop.getAttribute("data-modal") === "bag") state.bagOpen = false;
        else state.sourcesOpen = false;
        render();
      });
    });
    var listen = root.querySelector('[data-action="listen"]');
    if (listen) listen.addEventListener("click", playSequence);
    root.querySelectorAll("[data-tone]").forEach(function (button) {
      button.addEventListener("click", function () { tapTone(button.getAttribute("data-tone")); });
    });
    var lightStage = root.querySelector('[data-stage="light"]');
    if (lightStage) {
      lightStage.addEventListener("pointerdown", function (event) { moveLight(event, lightStage); });
      lightStage.addEventListener("pointermove", function (event) {
        if (event.pointerType === "mouse" || event.buttons > 0) moveLight(event, lightStage);
      });
    }
    var rubbingStage = root.querySelector('[data-stage="rubbing"]');
    if (rubbingStage) {
      rubbingStage.addEventListener("pointerdown", function (event) {
        state.rubbing = true;
        rubbingStage.setPointerCapture(event.pointerId);
        var tile = event.target.closest("[data-tile]");
        if (tile) revealTile(tile);
      });
      rubbingStage.addEventListener("pointermove", function (event) {
        if (!state.rubbing) return;
        var element = document.elementFromPoint(event.clientX, event.clientY);
        var tile = element && element.closest ? element.closest("[data-tile]") : null;
        if (tile && rubbingStage.contains(tile)) revealTile(tile);
      });
      rubbingStage.addEventListener("pointerup", function () { state.rubbing = false; });
      rubbingStage.addEventListener("pointercancel", function () { state.rubbing = false; });
    }
    root.querySelectorAll("[data-suspect]").forEach(function (button) {
      button.addEventListener("click", function () { state.suspect = button.getAttribute("data-suspect"); render(); });
    });
    root.querySelectorAll("[data-reason]").forEach(function (button) {
      button.addEventListener("click", function () { state.reason = button.getAttribute("data-reason"); render(); });
    });
  }

  render();
}());
