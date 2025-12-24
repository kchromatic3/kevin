(() => {
  const canvas = document.getElementById('tennis-game');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const court = {
    width: canvas.width,
    height: canvas.height,
    netWidth: 4,
    netGap: 18,
  };

  const paddles = {
    player: {
      x: 42,
      y: court.height / 2 - 45,
      width: 12,
      height: 90,
      speed: 360,
      move: 0,
    },
    ai: {
      x: court.width - 42 - 12,
      y: court.height / 2 - 45,
      width: 12,
      height: 90,
      speed: 315,
    },
  };

  const ball = {
    x: court.width / 2,
    y: court.height / 2,
    radius: 8,
    speed: 360,
    vx: 0,
    vy: 0,
  };

  const scores = {
    player: 0,
    ai: 0,
  };

  let isRunning = false;
  let lastTime = 0;
  const playerScoreEl = document.getElementById('player-score');
  const aiScoreEl = document.getElementById('ai-score');
  const statusEl = document.getElementById('game-status');

  const scoreNames = ['0', '15', '30', '40', '🏆'];

  function formatScore(value) {
    return scoreNames[Math.min(value, scoreNames.length - 1)];
  }

  function resetBall(servingPlayer = 1) {
    ball.x = court.width / 2;
    ball.y = court.height / 2;
    const direction = servingPlayer === 1 ? 1 : -1;
    const angle = (Math.random() * 0.4 - 0.2) * Math.PI; // small variation
    ball.vx = Math.cos(angle) * ball.speed * direction;
    ball.vy = Math.sin(angle) * ball.speed;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function drawCourt() {
    ctx.clearRect(0, 0, court.width, court.height);

    // outer lines
    ctx.strokeStyle = '#cce5ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, court.width - 40, court.height - 40);

    // midline and service boxes
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(court.width / 2, 20);
    ctx.lineTo(court.width / 2, court.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(20, court.height / 2);
    ctx.lineTo(court.width - 20, court.height / 2);
    ctx.stroke();

    // net
    ctx.fillStyle = '#f6f7fb';
    const netX = court.width / 2 - court.netWidth / 2;
    for (let y = 0; y < court.height; y += court.netGap) {
      ctx.fillRect(netX, y, court.netWidth, court.netGap / 2);
    }
  }

  function drawPaddle(paddle, color) {
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  }

  function drawBall() {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateScoreboard(message) {
    playerScoreEl.textContent = formatScore(scores.player);
    aiScoreEl.textContent = formatScore(scores.ai);
    if (message) {
      statusEl.textContent = message;
    }
  }

  function awardPoint(toPlayer) {
    scores[toPlayer] += 1;
    const winner = scores[toPlayer] >= 4;

    if (winner) {
      updateScoreboard(`${toPlayer === 'player' ? 'You' : 'AI'} win the game! Press R to restart.`);
      isRunning = false;
    } else {
      updateScoreboard(`${toPlayer === 'player' ? 'You scored!' : 'AI scored.'} Press Space to serve.`);
      resetBall(toPlayer === 'player' ? 1 : -1);
    }
  }

  function updateAI(dt) {
    const targetY = ball.y - paddles.ai.height / 2;
    const direction = targetY > paddles.ai.y ? 1 : -1;
    const distance = Math.abs(targetY - paddles.ai.y);
    const speed = paddles.ai.speed * dt;
    if (distance > 8) {
      paddles.ai.y += direction * Math.min(speed, distance);
    }
    paddles.ai.y = clamp(paddles.ai.y, 20, court.height - 20 - paddles.ai.height);
  }

  function handleCollisions(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // top/bottom bounce
    if (ball.y - ball.radius < 20) {
      ball.y = 20 + ball.radius;
      ball.vy *= -1;
    } else if (ball.y + ball.radius > court.height - 20) {
      ball.y = court.height - 20 - ball.radius;
      ball.vy *= -1;
    }

    // paddle collisions
    const paddlesList = [paddles.player, paddles.ai];
    const signs = [1, -1];
    paddlesList.forEach((paddle, index) => {
      if (
        ball.x + ball.radius > paddle.x &&
        ball.x - ball.radius < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height
      ) {
        const relativeIntersectY = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
        const bounceAngle = relativeIntersectY * (Math.PI / 3.2);
        const direction = signs[index];
        ball.vx = Math.cos(bounceAngle) * ball.speed * direction;
        ball.vy = Math.sin(bounceAngle) * ball.speed;
        ball.x = paddle.x + (direction > 0 ? paddle.width + ball.radius : -ball.radius);
      }
    });

    // scoring
    if (ball.x + ball.radius < 0) {
      awardPoint('ai');
      resetBall(-1);
    } else if (ball.x - ball.radius > court.width) {
      awardPoint('player');
      resetBall(1);
    }
  }

  function draw() {
    drawCourt();
    drawPaddle(paddles.player, '#f4f4f4');
    drawPaddle(paddles.ai, '#aad9ff');
    drawBall();
  }

  function update(dt) {
    paddles.player.y = clamp(
      paddles.player.y + paddles.player.move * paddles.player.speed * dt,
      20,
      court.height - 20 - paddles.player.height
    );

    updateAI(dt);
    handleCollisions(dt);
  }

  function loop(timestamp) {
    if (!isRunning) return;
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(delta);
    draw();
    requestAnimationFrame(loop);
  }

  function startGame() {
    if (scores.player >= 4 || scores.ai >= 4) return;
    if (!isRunning) {
      lastTime = performance.now();
      isRunning = true;
      statusEl.textContent = 'Rally on!';
      requestAnimationFrame(loop);
    }
  }

  function pauseGame() {
    isRunning = false;
    statusEl.textContent = 'Paused. Press Space to resume.';
  }

  function resetMatch() {
    scores.player = 0;
    scores.ai = 0;
    updateScoreboard('Press Space to serve');
    paddles.player.y = court.height / 2 - paddles.player.height / 2;
    paddles.ai.y = court.height / 2 - paddles.ai.height / 2;
    resetBall(1);
    isRunning = false;
  }

  document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowUp') {
      paddles.player.move = -1;
    } else if (event.code === 'ArrowDown') {
      paddles.player.move = 1;
    } else if (event.code === 'Space') {
      if (isRunning) {
        pauseGame();
      } else {
        startGame();
      }
    } else if (event.code === 'KeyR') {
      resetMatch();
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      paddles.player.move = 0;
    }
  });

  resetMatch();
  draw();
})();
