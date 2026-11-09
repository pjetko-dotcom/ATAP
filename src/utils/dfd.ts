export interface DiagramRectangle {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramLayoutIssues {
  overlappingZones: Array<[DiagramRectangle, DiagramRectangle]>;
  overlappingComponents: Array<[DiagramRectangle, DiagramRectangle]>;
}

export interface FlowPathGeometry {
  path: string;
  labelX: number;
  labelY: number;
  length: number;
  obstructedComponentIds: string[];
}

function rectanglesOverlap(a: DiagramRectangle, b: DiagramRectangle): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function getOverlaps(items: DiagramRectangle[]): Array<[DiagramRectangle, DiagramRectangle]> {
  const overlaps: Array<[DiagramRectangle, DiagramRectangle]> = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (rectanglesOverlap(items[i], items[j])) overlaps.push([items[i], items[j]]);
    }
  }
  return overlaps;
}

export function getDiagramLayoutIssues(
  zones: DiagramRectangle[],
  components: DiagramRectangle[]
): DiagramLayoutIssues {
  return {
    overlappingZones: getOverlaps(zones),
    overlappingComponents: getOverlaps(components)
  };
}

export function getFlowPathGeometry(
  from: DiagramRectangle,
  to: DiagramRectangle,
  parallelIndex = 0,
  parallelCount = 1,
  obstacles: DiagramRectangle[] = []
): FlowPathGeometry | null {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return null;

  const getEdgeScale = (rectangle: DiagramRectangle): number => Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : rectangle.width / 2 / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : rectangle.height / 2 / Math.abs(dy)
  );
  const x1 = fromX + dx * getEdgeScale(from);
  const y1 = fromY + dy * getEdgeScale(from);
  const x2 = toX - dx * getEdgeScale(to);
  const y2 = toY - dy * getEdgeScale(to);
  const length = Math.hypot(x2 - x1, y2 - y1);
  const isReverseDirection = fromX > toX || (fromX === toX && fromY > toY);
  const directionalIndex = isReverseDirection ? parallelCount - 1 - parallelIndex : parallelIndex;
  const baseOffset = (directionalIndex - (parallelCount - 1) / 2) * 28;
  const normalX = -(y2 - y1) / length;
  const normalY = (x2 - x1) / length;
  const createGeometry = (offset: number) => {
    const controlX = (x1 + x2) / 2 + normalX * offset;
    const controlY = (y1 + y2) / 2 + normalY * offset;
    const obstructedComponentIds = obstacles.filter(obstacle => {
      for (let step = 1; step < 20; step += 1) {
        const t = step / 20;
        const inverseT = 1 - t;
        const x = inverseT * inverseT * x1 + 2 * inverseT * t * controlX + t * t * x2;
        const y = inverseT * inverseT * y1 + 2 * inverseT * t * controlY + t * t * y2;
        if (x > obstacle.x && x < obstacle.x + obstacle.width &&
          y > obstacle.y && y < obstacle.y + obstacle.height) return true;
      }
      return false;
    }).map(obstacle => obstacle.id);
    return {
      offset,
      controlX,
      controlY,
      obstructedComponentIds
    };
  };
  const candidates = [baseOffset];
  for (let step = 1; step <= 10; step += 1) {
    candidates.push(baseOffset + step * 28, baseOffset - step * 28);
  }
  const selected = candidates
    .map(createGeometry)
    .find(candidate => candidate.obstructedComponentIds.length === 0) ?? createGeometry(baseOffset);
  const labelX = (x1 + 2 * selected.controlX + x2) / 4;
  const labelY = (y1 + 2 * selected.controlY + y2) / 4;

  return {
    path: `M ${x1} ${y1} Q ${selected.controlX} ${selected.controlY} ${x2} ${y2}`,
    labelX,
    labelY,
    length: length + Math.abs(selected.offset),
    obstructedComponentIds: selected.obstructedComponentIds
  };
}
