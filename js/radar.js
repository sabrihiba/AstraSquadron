// Comportement 6 : extraction exacte de la pi?ce jointe utilisateur.
    const colors = ['#7de7ff','#ffcf70','#f48ac7','#a9f28e','#b2a0ff','#ff9279','#67f0c1','#d8e47b'];
    const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    const mult = (v, amount) => ({ x: v.x * amount, y: v.y * amount });
    const magnitude = v => Math.hypot(v.x, v.y);
    const normalized = v => { const length = magnitude(v); return length > 1e-9 ? mult(v, 1 / length) : { x: 0, y: 0 }; };
    const limit = (v, max) => { const length = magnitude(v); return length > max && length > 0 ? mult(v, max / length) : v; };

    function calculateMultiRayAvoidance(position, velocity, obstacleList, rayCount, clearance, maxForce, aheadFrames) {
      const requestedCount = Number(rayCount);
      const speed = magnitude(velocity);
      if (!Number.isFinite(requestedCount) || requestedCount < 1 || !Number.isFinite(speed) || speed < 1e-9 || !Number.isFinite(maxForce)) {
        return { force: { x: 0, y: 0 }, rays: [] };
      }
      const count = Math.max(1, Math.min(31, Math.floor(requestedCount)));
      const heading = speed > 1e-9 ? Math.atan2(velocity.y, velocity.x) : 0;
      const rayLength = speed * aheadFrames;
      const spread = Math.PI * 2 / 3;
      const rays = [];
      let total = { x: 0, y: 0 };

      for (let index = 0; index < count; index++) {
        const ratio = count === 1 ? 0.5 : index / (count - 1);
        const offset = (ratio - 0.5) * spread;
        const angle = heading + offset;
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        const ahead = add(position, mult(direction, rayLength));
        const ahead2 = add(position, mult(direction, rayLength * 0.5));
        const samplePoints = [position, ahead2, ahead];
        let closest = null;
        let closestDistance = Infinity;
        let closestPoint = null;

        for (const obstacle of obstacleList) {
          for (const sample of samplePoints) {
            const distance = magnitude(sub(sample, obstacle.pos));
            if (distance < closestDistance) {
              closestDistance = distance;
              closest = obstacle;
              closestPoint = sample;
            }
          }
        }

        let force = { x: 0, y: 0 };
        const threatened = closest !== null && closestDistance < closest.r + clearance;
        if (threatened) {
          let away = sub(closestPoint, closest.pos);
          if (magnitude(away) < 1e-9) {
            const side = offset < 0 ? -1 : 1;
            away = { x: -direction.y * side, y: direction.x * side };
          }
          force = mult(normalized(away), maxForce / 2);
          total = add(total, force);
        }

        rays.push({ angle, direction, ahead, ahead2, closest, closestPoint, closestDistance, threatened, force, color: colors[index % colors.length] });
      }

      return { force: mult(total, 1 / count), rays };
    }
