(function(){
  // ===== 여기 문구만 수정하면 돼요 =====
  var LOADING_MSGS = ["분석 중...", "계산 중..."];

  var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
  var current = 0, dodges = 0, resets = 0;

  // 질문 번호 자동 매기기 (dodge / pick / slider 카드만)
  var questions = cards.filter(function(c){
    var t = c.dataset.type; return t === "dodge" || t === "pick" || t === "slider";
  });
  questions.forEach(function(c, i){
    c.querySelector(".step").textContent = "질문 " + (i+1) + " / " + questions.length;
  });

  function rand(a, b){ return Math.floor(Math.random()*(b-a+1)) + a; }

  // ----- 난장판(chaos) 효과 -----
  function resetChaos(card){
    card.classList.remove("chaos1","chaos2","chaos3");
    card._errored = false;
    var t = card.querySelector(".toast"); if(t) t.remove();
    card.querySelectorAll(".btns button").forEach(function(b){ b.style.transform = ""; b._dodged = 0; });
  }
  function applyChaos(card){
    var level = Number(card.dataset.chaos || 0);
    if(!level) return;
    card.classList.add("chaos" + level);
    var box = card.querySelector(".btns");
    if(box && card.dataset.type === "pick"){   // 보기 순서를 매번 섞기
      var arr = Array.prototype.slice.call(box.children);
      arr.sort(function(){ return Math.random() - 0.5; });
      arr.forEach(function(b){ box.appendChild(b); });
    }
  }
  function showError(card){
    var d = document.createElement("div");
    d.className = "toast";
    d.textContent = ERROR_MSG;
    card.appendChild(d);
  }

  function show(i){
    current = i;
    cards.forEach(function(c){ c.classList.add("hide"); });
    var card = cards[i];
    resetChaos(card);
    applyChaos(card);
    card.classList.remove("hide");
    var type = card.dataset.type;
    if(type === "loading") analyze(card);
    if(type === "result") finish(card);
  }
  function next(){ if(current < cards.length - 1) show(current + 1); }

  cards.forEach(function(card){
    var type = card.dataset.type;

    // 홈 화면의 시작 버튼
    if(type === "home"){
      card.querySelector(".start").addEventListener("click", next);
    }

    // 도망가는 "아니오"
    if(type === "dodge"){
      var no = card.querySelector(".no");
      var run = function(e){
        if(e) e.preventDefault();
        dodges++;
        no.classList.add("run");
        var w = window.innerWidth - no.offsetWidth - 20;
        var h = window.innerHeight - no.offsetHeight - 20;
        no.style.left = Math.max(10, Math.random()*w) + "px";
        no.style.top = Math.max(10, Math.random()*h) + "px";
      };
      no.addEventListener("mouseover", run);
      no.addEventListener("touchstart", run, {passive:false});
      no.addEventListener("click", run);
      card.querySelector(".yes").addEventListener("click", function(){
        no.classList.remove("run"); next();
      });
    }

    // 아무거나 눌러도 넘어가는 질문
    if(type === "pick"){
      var level = Number(card.dataset.chaos || 0);
      card.querySelectorAll("button").forEach(function(b){
        b._dodged = 0;
        if(level >= 2){   // 보기 버튼이 마우스를 피해 도망감
          var limit = level >= 3 ? 4 : 2;
          var mv = function(e){
            if(b._dodged < limit){
              e.preventDefault(); b._dodged++;
              b.style.transform = "translate(" + rand(-110,110) + "px," + rand(-70,70) + "px)";
            }
          };
          b.addEventListener("mouseover", mv);
          b.addEventListener("touchstart", mv, {passive:false});
        }
        b.addEventListener("click", function(){
          if(level >= 3 && !card._errored){ card._errored = true; showError(card); return; } // 첫 클릭은 가짜 오류
          next();
        });
      });
    }

    // 0으로 돌아가는 슬라이더
    if(type === "slider"){
      var s = card.querySelector(".slider"), v = card.querySelector(".val"), hint = card.querySelector(".hint");
      var tries = 0;
      s.addEventListener("input", function(){ v.textContent = s.value; });
      s.addEventListener("change", function(){
        tries++; resets++;
        var t = setInterval(function(){
          var n = Number(s.value) - 4;
          if(n <= 0){ n = 0; clearInterval(t); }
          s.value = n; v.textContent = n;
          if(n === 0){
            hint.textContent = tries < SLIDER_TRIES ? SLIDER_RETRY : SLIDER_GIVEUP;
            if(tries >= SLIDER_TRIES){ tries = 0; setTimeout(next, 900); }
          }
        }, 15);
      });
    }

    // 다시 하기
    if(type === "result"){
      card.querySelector(".again").addEventListener("click", function(){
        dodges = 0; resets = 0;
        document.querySelectorAll(".slider").forEach(function(s){ s.value = 50; });
        document.querySelectorAll(".val").forEach(function(v){ v.textContent = 50; });
        document.querySelectorAll(".hint").forEach(function(h){ h.textContent = "손을 떼면 제출됩니다."; });
        show(0);
      });
    }
  });

  // 가짜 로딩: 99%에서 멈춤
  function analyze(card){
    var p = 0;
    var t = setInterval(function(){
      p += Math.random()*7;
      if(p >= 99){ p = 99; clearInterval(t); setTimeout(next, 2900); }
      card.querySelector(".fill").style.width = p + "%";
      card.querySelector(".pct").textContent = Math.floor(p) + "%";
      card.querySelector(".ltext").textContent = LOADING_MSGS[Math.min(LOADING_MSGS.length-1, Math.floor(p/26))];
    }, 140);
  }

  // 참여자 수 가짜 실시간 증가 (자릿수가 룰렛처럼 돌아가며 올라감)
  var counter = document.querySelector(".count");
  if(counter){
    var num = Number(counter.dataset.start) || 0;
    var digits = [];      // 현재 화면의 숫자 릴 목록
    var shape = "";       // 자릿수/쉼표 구조 (바뀌면 다시 만듦)

    var build = function(text){
      counter.innerHTML = "";
      digits = [];
      text.split("").forEach(function(ch){
        if(/[0-9]/.test(ch)){
          var box = document.createElement("span"); box.className = "digit";
          var reel = document.createElement("span"); reel.className = "reel";
          for(var r = 0; r < 20; r++){            // 0~9를 두 번 쌓아 둠
            var n = document.createElement("span"); n.textContent = r % 10; reel.appendChild(n);
          }
          box.appendChild(reel); counter.appendChild(box);
          digits.push({reel: reel, pos: 0});
        } else {
          var sep = document.createElement("span"); sep.className = "sep"; sep.textContent = ch;
          counter.appendChild(sep);
        }
      });
    };

    var move = function(d, target){
      var cur = d.pos % 10;
      var delta = (target - cur + 10) % 10;
      if(delta === 0) return;
      d.pos += delta;
      d.reel.style.transform = "translateY(" + (-d.pos * 1.25) + "em)";
      if(d.pos >= 10){                              // 한 바퀴 넘으면 몰래 앞으로 되감기
        setTimeout(function(){
          d.pos -= 10;
          d.reel.style.transition = "none";
          d.reel.style.transform = "translateY(" + (-d.pos * 1.25) + "em)";
          void d.reel.offsetHeight;
          d.reel.style.transition = "";
        }, 650);
      }
    };

    var render = function(first){
      var text = num.toLocaleString("ko-KR");
      var key = text.replace(/[0-9]/g, "0");
      if(key !== shape){ shape = key; build(text); first = true; }
      var i = 0;
      text.split("").forEach(function(ch){
        if(/[0-9]/.test(ch)){
          var d = digits[i++], t = Number(ch);
          if(first){ d.pos = t; d.reel.style.transition = "none"; d.reel.style.transform = "translateY(" + (-t * 1.25) + "em)"; void d.reel.offsetHeight; d.reel.style.transition = ""; }
          else move(d, t);
        }
      });
      counter.setAttribute("aria-label", text + "명");
    };

    var unit = document.createElement("span");
    render(true);
    counter.insertAdjacentHTML("beforeend", '<span class="sep">명</span>');
    setInterval(function(){
      num += rand(1, 3);
      var before = shape;
      render(false);
      if(shape !== before) counter.insertAdjacentHTML("beforeend", '<span class="sep">명</span>');
    }, 1000);
  }

  show(0);
})();