/**
 * Fractal Grower - the branching rule, the camera, the palette. No DOM in here.
 *
 * ONE RULE, REPEATED
 *
 * A stem grows. At its tip it splits, and each piece does exactly what the stem
 * did: grow, then split, then each piece does exactly what the stem did. That
 * sentence is the whole simulation. Nothing in this file knows what a tree is,
 * what a fern is or what lightning is; there is one recursion, and the four
 * seeds differ only in how many children a split makes, which way they are
 * turned, and how much shorter they are than their parent.
 *
 * That is the thing the child's fingers are meant to find. They are not told
 * "this is recursion". They drag the branching angle and the ENTIRE structure
 * changes at once, because the angle they moved is the same angle used at every
 * split, at every size, all the way down. A pine becomes an oak in one gesture.
 * Then they tap a different seed and the same rule, with one different split,
 * makes a fern instead. Same rule, different nature.
 *
 * WHY IT IS OUT HERE
 *
 * Every claim the activity makes to a child is a claim about this file, so
 * every one of them is a test in `fractal-grower.test.ts` rather than a
 * sentence in a comment:
 *
 *   - "the small branches copy the big ones" is measured: the sub-tree hanging
 *     off a first-generation child is compared against the whole structure and
 *     the ratio of their sizes is asserted against the ratio parameter.
 *   - "you changed one thing and the whole tree changed" is measured: the
 *     bounding box is swept across the angle range and asserted to widen and
 *     shorten monotonically.
 *   - "one rule made all four" is structural: the four seeds are four
 *     ChildTemplate lists handed to one function, and a test asserts that no
 *     seed reaches its own code path.
 *
 * GROWING MUST NOT RESHUFFLE WHAT IS ALREADY THERE
 *
 * The wobble on each branch is deterministic per NODE, hashed from the path
 * taken to reach it, not drawn from a counter in traversal order. A counter
 * would be perfectly deterministic and still wrong: growing the tree one more
 * generation would allocate different numbers to the branches already on
 * screen, and the child would watch their own tree twitch as they extended it.
 * A test grows the same tree to two heights and asserts the shared generations
 * are identical, segment for segment.
 *
 * Issue: #225 (wave 3, Fractal Grower)
 */

/*
 * The colour fence is imported rather than copied.
 *
 * Hues 270-350 are banned by BRAND.md across the whole product, and
 * `pattern-garden.ts` is where that ban was first made unreachable-by-
 * construction rather than promised. It is a brand rule and not a garden rule,
 * and two copies of a fence drift the day after they are written, so this file
 * folds through the same function. Its own suite still proves the fence holds
 * for every colour THIS activity can produce, at every seed and every setting.
 */
import { hueIsAllowed, safeHue } from '@/lib/pattern-garden';

export { hueIsAllowed, safeHue };

// ---------------------------------------------------------------------------
// What the child's fingers control
// ---------------------------------------------------------------------------

/**
 * The branching angle, in radians, as a half-angle off the parent stem.
 *
 * The low end is not zero. At zero every child sits exactly on top of its
 * parent, the structure is a single line, and the child's drag has visibly
 * broken the activity. Just under four degrees still reads as a tight pine and
 * still obviously branches. The high end is just past sixty-five degrees, where
 * a tree has opened out into a fan and going further only turns it inside out.
 */
export const ANGLE_MIN = 0.06;
export const ANGLE_MAX = 1.15;

/**
 * How long a child is compared with its parent.
 *
 * Below about 0.45 the second generation is already too short to see against
 * the first and the structure looks like a stick with fluff on it. Above about
 * 0.92 children are nearly as long as their parents, everything overlaps
 * everything, and that is the dense coral the brief asks for: it is the
 * interesting end, not a broken one, which is why the ceiling is close to 1
 * rather than at it. At exactly 1 the structure stops shrinking at all and the
 * deepest generation is as long as the trunk, which is a hairball.
 */
export const RATIO_MIN = 0.45;
export const RATIO_MAX = 0.92;

/**
 * Ceiling on segments.
 *
 * Every seed here is a full tree of its own arity, so its worst case is exactly
 * the sum of children^generation and there is nothing to estimate. Measured, and
 * asserted in the suite so these numbers cannot rot: fern 121, river 121,
 * lightning 255, tree 511. The worst honest case in the product is 511, and this
 * cap is eight times it.
 *
 * It is here so that a future seed with four children and a deep max cannot
 * quietly hand a tablet a hundred thousand paths; growth stops at the cap rather
 * than the frame stopping.
 */
export const SEGMENT_CAP = 4096;

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

export type PresetId = 'tree' | 'fern' | 'lightning' | 'river';

export const PRESET_IDS: readonly PresetId[] = ['tree', 'fern', 'lightning', 'river'];

/**
 * One child of a split, described relative to its parent.
 *
 * Everything here is a MULTIPLIER on what the child's fingers are holding, not
 * a value of its own. That is the whole reason one drag changes the entire
 * structure and the reason four different natures come out of one recursion: a
 * seed cannot set an angle, it can only say "this child turns twice as far as
 * whatever the child is asking for".
 */
export interface ChildTemplate {
  /** Multiplier on the branching angle. 0 continues straight on. */
  angle: number;
  /** Where around the parent stem this child is thrown, in radians. */
  roll: number;
  /** Multiplier on the length ratio. */
  ratio: number;
  /** Multiplier on the thickness taper. */
  width: number;
}

export interface BranchRule {
  id: PresetId;
  /** Plain word for a screen reader and the seed button. */
  label: string;
  /** The split. Same list used at every node, at every size. */
  children: ChildTemplate[];
  /** How many generations a full drag of the trunk reaches. */
  maxDepth: number;
  /** Thickness of a child against its parent. */
  taper: number;
  /** How much each generation is pulled toward the ground. */
  gravity: number;
  /** How much a segment bows along its length. Painterly, not structural. */
  curve: number;
  /** Size of the deterministic wobble, in radians. */
  jitter: number;
  /** How far the frame is turned about the stem between generations. */
  rollStep: number;
  /** Hue arc, in degrees, walked as the generations deepen. Folded by safeHue. */
  hueBase: number;
  hueSpan: number;
  /** Radius of the soft mark left at a growing tip, relative to segment length. */
  tipSize: number;
}

/**
 * The four seeds.
 *
 * Read them as four answers to one question: when a stem splits, what comes
 * out? A tree says two, evenly, turned a quarter turn each generation. A fern
 * says two side shoots and a leader that keeps going, which is why a frond has
 * a spine. Lightning says one nearly-straight continuation and one short fork
 * thrown wide, which is why a bolt has a path and stubs off it. A river delta
 * says three, spread wide, barely shortening, dragged downhill.
 *
 * Nothing else differs. There is no per-seed drawing code and no per-seed
 * branch anywhere below.
 */
export const PRESETS: Record<PresetId, BranchRule> = {
  tree: {
    id: 'tree',
    label: 'Tree',
    children: [
      { angle: 1, roll: 0, ratio: 1, width: 1 },
      { angle: -1, roll: 0, ratio: 1, width: 1 },
    ],
    maxDepth: 9,
    taper: 0.72,
    gravity: 0.035,
    curve: 0.1,
    jitter: 0.09,
    rollStep: 1.35,
    hueBase: 96,
    hueSpan: 44,
    tipSize: 0.3,
  },

  fern: {
    id: 'fern',
    label: 'Fern',
    children: [
      // The leader. Carries on nearly straight and keeps most of its length,
      // which is what gives a frond a spine to hang shoots off.
      { angle: 0.16, roll: 0, ratio: 0.94, width: 0.86 },
      { angle: 1.25, roll: 0, ratio: 0.56, width: 0.62 },
      { angle: -1.25, roll: 0, ratio: 0.56, width: 0.62 },
    ],
    maxDepth: 5,
    taper: 0.78,
    gravity: 0.07,
    curve: 0.22,
    jitter: 0.05,
    rollStep: 0.42,
    hueBase: 118,
    hueSpan: 38,
    tipSize: 0.42,
  },

  lightning: {
    id: 'lightning',
    children: [
      { angle: 0.28, roll: 0, ratio: 0.96, width: 0.9 },
      { angle: -1.5, roll: 0.9, ratio: 0.58, width: 0.5 },
    ],
    label: 'Lightning',
    maxDepth: 8,
    taper: 0.8,
    gravity: -0.02,
    curve: 0.03,
    jitter: 0.24,
    rollStep: 2.1,
    hueBase: 44,
    hueSpan: 22,
    tipSize: 0.16,
  },

  river: {
    id: 'river',
    label: 'River',
    children: [
      { angle: 1.05, roll: 0, ratio: 0.86, width: 0.74 },
      { angle: 0.05, roll: 0, ratio: 0.82, width: 0.74 },
      { angle: -1.05, roll: 0, ratio: 0.86, width: 0.74 },
    ],
    maxDepth: 5,
    taper: 0.82,
    gravity: 0.16,
    curve: 0.14,
    jitter: 0.12,
    rollStep: 0.28,
    hueBase: 178,
    hueSpan: 34,
    tipSize: 0.2,
  },
};

// ---------------------------------------------------------------------------
// Growing
// ---------------------------------------------------------------------------

export interface GrowthParams {
  preset: PresetId;
  /** Branching half-angle in radians. Clamped to ANGLE_MIN..ANGLE_MAX. */
  angle: number;
  /** Length of a child against its parent. Clamped to RATIO_MIN..RATIO_MAX. */
  ratio: number;
  /** How far the trunk has been dragged up, 0..1. Zero is a bare seed. */
  growth: number;
  /** Fixes the wobble. Same seed, same structure, forever. */
  seed: number;
}

export interface Segment {
  /** Model space. The seed is the origin, y runs up, z runs away from the viewer. */
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  /** Distance from the trunk, in splits. The trunk is 0. */
  generation: number;
  /** Model-space half-thickness at the base of this segment. */
  width: number;
  /** How far along the seed's hue arc this generation sits, 0..1. */
  hueT: number;
  /** True when nothing grows on past this segment. */
  tip: boolean;
  /**
   * How much of this segment has grown, 0..1. Only the newest generation is
   * ever partial; everything behind it is 1.
   */
  fade: number;
  /** Sideways bow of the segment, in model units, for a painterly stroke. */
  bow: number;
}

export interface Structure {
  segments: Segment[];
  /** Generations present, counting the trunk. A bare seed is 0, a trunk is 1. */
  generations: number;
  /** Model-space extent of everything grown, for fitting it on a screen. */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /**
   * How far the structure reaches toward and away from the viewer.
   *
   * Not decoration, and not a small number. Measured across every seed at every
   * setting of both controls, and asserted in the suite: the shallowest thing a
   * child can grow is a fern 0.016 trunk lengths deep, and the deepest is a tree
   * 7.85 deep, front to back. One fixed camera cannot serve both without either
   * flattening the fern or putting the tree's near branches behind the viewer's
   * eye, so the camera is placed from these numbers instead.
   */
  minZ: number;
  maxZ: number;
  /** True when growth stopped at SEGMENT_CAP rather than at the seed's depth. */
  capped: boolean;
}

export function clampAngle(a: number): number {
  if (!Number.isFinite(a)) return ANGLE_MIN;
  return Math.min(ANGLE_MAX, Math.max(ANGLE_MIN, a));
}

export function clampRatio(r: number): number {
  if (!Number.isFinite(r)) return RATIO_MIN;
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, r));
}

export function clampGrowth(g: number): number {
  if (!Number.isFinite(g)) return 0;
  return Math.min(1, Math.max(0, g));
}

/**
 * A branch's wobble, hashed from the path taken to reach it.
 *
 * Not a counter. See the file header: a counter is deterministic and still
 * reshuffles a child's existing branches every time they grow the tree.
 */
function hashChild(key: number, childIndex: number): number {
  let h = (key ^ Math.imul(childIndex + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return h;
}

/** A hash, as a number in 0..1. */
function unitOf(h: number): number {
  return h / 4294967296;
}

interface Node {
  x: number;
  y: number;
  z: number;
  /** Unit direction of travel. */
  dx: number;
  dy: number;
  dz: number;
  /** Unit vector perpendicular to the direction. Carried down so the frame
   *  cannot flip halfway along a branch. */
  sx: number;
  sy: number;
  sz: number;
  len: number;
  width: number;
  generation: number;
  key: number;
}

/**
 * Grow the structure.
 *
 * Pure: same parameters in, same segments out, no clock, no Math.random. That
 * is what makes the measurements in the suite mean anything, and it is also
 * what lets the seed thumbnails in the UI be drawn from the real rule rather
 * than from four hand-drawn icons.
 *
 * Breadth first, so segments come out in generation order and the cap, if it is
 * ever reached, takes the deepest generation rather than a random slice.
 */
export function growStructure(params: GrowthParams): Structure {
  return growWithRule(PRESETS[params.preset] ?? PRESETS.tree, params);
}

/**
 * The recursion, given any rule at all.
 *
 * Exported so the suite can prove the claim the fourth naming line makes to a
 * child. "One rule made the tree, the fern and the lightning" is only true if
 * there is literally one function and the seeds are only data going into it, so
 * a test hands this the four presets, checks the results are identical to what
 * the named entry points produce, and hands it a fifth rule that exists nowhere
 * in the product to show nothing here is looking at which seed it was given.
 */
export function growWithRule(rule: BranchRule, params: Omit<GrowthParams, 'preset'>): Structure {
  const angle = clampAngle(params.angle);
  const ratio = clampRatio(params.ratio);
  const growth = clampGrowth(params.growth);

  const segments: Segment[] = [];
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  let minZ = 0;
  let maxZ = 0;
  let capped = false;

  /** How many generations deep the drag has reached, as a real number. */
  const depthF = growth * rule.maxDepth;
  const lastGeneration = Math.max(0, Math.ceil(depthF) - 1);

  if (depthF <= 0) {
    return { segments, generations: 0, minX, maxX, minY, maxY, minZ, maxZ, capped };
  }

  const hueDenom = Math.max(1, rule.maxDepth - 1);

  let queue: Node[] = [
    {
      x: 0,
      y: 0,
      z: 0,
      dx: 0,
      dy: 1,
      dz: 0,
      sx: 1,
      sy: 0,
      sz: 0,
      len: 1,
      width: 1,
      generation: 0,
      key: params.seed >>> 0,
    },
  ];

  while (queue.length > 0) {
    const next: Node[] = [];

    for (const node of queue) {
      // The ceiling, enforced where segments are actually created rather than
      // only where children are queued. Guarding the queue alone lets a whole
      // final generation through and overshoots by half again, which is what
      // the first version of this did.
      if (segments.length >= SEGMENT_CAP) {
        capped = true;
        break;
      }

      const fade = Math.min(1, Math.max(0, depthF - node.generation));
      if (fade <= 0) continue;

      const grownLen = node.len * fade;
      const x1 = node.x + node.dx * grownLen;
      const y1 = node.y + node.dy * grownLen;
      const z1 = node.z + node.dz * grownLen;

      // Complete generations branch. A tip that is still extending does not,
      // which is what makes growing look like growing rather than like a
      // finished tree fading in.
      const willBranch =
        fade >= 1 && node.generation < lastGeneration && segments.length < SEGMENT_CAP;

      const bow =
        rule.curve * node.len * (unitOf(hashChild(node.key, 91)) - 0.5) * 2;

      segments.push({
        x0: node.x,
        y0: node.y,
        z0: node.z,
        x1,
        y1,
        z1,
        generation: node.generation,
        width: node.width,
        hueT: Math.min(1, node.generation / hueDenom),
        tip: !willBranch,
        fade,
        bow,
      });

      if (x1 < minX) minX = x1;
      if (x1 > maxX) maxX = x1;
      if (y1 < minY) minY = y1;
      if (y1 > maxY) maxY = y1;
      if (z1 < minZ) minZ = z1;
      if (z1 > maxZ) maxZ = z1;
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
      if (node.z < minZ) minZ = node.z;
      if (node.z > maxZ) maxZ = node.z;

      if (!willBranch) {
        if (fade >= 1 && node.generation < lastGeneration) capped = true;
        continue;
      }

      /*
       * Turn the frame about the stem, so successive generations do not all
       * land in one plane and the structure has actual depth in it.
       *
       * Except at the trunk, which is turned by nothing at all. The first
       * version rolled there too, and the observed pass showed what that costs:
       * the trunk's roll threw both of its children almost entirely into the
       * depth axis, so the child's FIRST split, the one the first naming line is
       * about, projected as a bump on a stem rather than as two branches. The
       * trunk splits in the picture plane, where it can be seen, and the depth
       * builds from the generation after it.
       */
      const roll = node.generation === 0 ? 0 : rule.rollStep;
      const upx = node.dy * node.sz - node.dz * node.sy;
      const upy = node.dz * node.sx - node.dx * node.sz;
      const upz = node.dx * node.sy - node.dy * node.sx;
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const bsx = node.sx * cr + upx * sr;
      const bsy = node.sy * cr + upy * sr;
      const bsz = node.sz * cr + upz * sr;
      const bux = node.dy * bsz - node.dz * bsy;
      const buy = node.dz * bsx - node.dx * bsz;
      const buz = node.dx * bsy - node.dy * bsx;

      for (let i = 0; i < rule.children.length; i++) {
        if (segments.length + next.length >= SEGMENT_CAP) {
          capped = true;
          break;
        }
        const tpl = rule.children[i];
        const key = hashChild(node.key, i + 1);

        // Which way off the stem this child leans. One vector, built from the
        // frame, so the whole thing is a rotation of the parent direction
        // toward it by the angle the child is holding.
        const px = bsx * Math.cos(tpl.roll) + bux * Math.sin(tpl.roll);
        const py = bsy * Math.cos(tpl.roll) + buy * Math.sin(tpl.roll);
        const pz = bsz * Math.cos(tpl.roll) + buz * Math.sin(tpl.roll);

        const wobble = (unitOf(hashChild(key, 7)) - 0.5) * 2 * rule.jitter;
        const a = angle * tpl.angle + wobble;
        const ca = Math.cos(a);
        const sa = Math.sin(a);

        let cdx = node.dx * ca + px * sa;
        let cdy = node.dy * ca + py * sa;
        let cdz = node.dz * ca + pz * sa;

        // Weight. Every generation is pulled a little further toward the
        // ground than the one before it, which is why a real branch droops at
        // the ends and a straight-line recursion does not.
        const pull = rule.gravity * ((node.generation + 1) / rule.maxDepth);
        cdy -= pull;

        const dl = Math.hypot(cdx, cdy, cdz) || 1;
        cdx /= dl;
        cdy /= dl;
        cdz /= dl;

        // Re-square the frame against the child's own direction, rather than
        // rebuilding it from world up. Rebuilding flips the frame the moment a
        // branch passes vertical and the tree visibly tears along that line.
        let nsx = bsx - cdx * (bsx * cdx + bsy * cdy + bsz * cdz);
        let nsy = bsy - cdy * (bsx * cdx + bsy * cdy + bsz * cdz);
        let nsz = bsz - cdz * (bsx * cdx + bsy * cdy + bsz * cdz);
        let nl = Math.hypot(nsx, nsy, nsz);
        if (nl < 1e-6) {
          // Degenerate only if the child ended up parallel to the frame
          // vector. Any perpendicular will do, and this one is stable.
          nsx = -cdy;
          nsy = cdx;
          nsz = 0;
          nl = Math.hypot(nsx, nsy, nsz) || 1;
        }
        nsx /= nl;
        nsy /= nl;
        nsz /= nl;

        next.push({
          x: x1,
          y: y1,
          z: z1,
          dx: cdx,
          dy: cdy,
          dz: cdz,
          sx: nsx,
          sy: nsy,
          sz: nsz,
          len: node.len * ratio * tpl.ratio,
          width: node.width * rule.taper * tpl.width,
          generation: node.generation + 1,
          key,
        });
      }
    }

    queue = next;
  }

  const generations = segments.length === 0 ? 0 : segments[segments.length - 1].generation + 1;

  return { segments, generations, minX, maxX, minY, maxY, minZ, maxZ, capped };
}

// ---------------------------------------------------------------------------
// The camera
// ---------------------------------------------------------------------------

/**
 * How far back the viewer stands, in units of the structure's own half-depth.
 *
 * A ratio rather than a distance, because the structure is not a fixed size.
 * Measured in `fractal-grower.test.ts` across every seed at every setting of
 * both controls: the shallowest is a fern 0.016 trunk lengths deep and the
 * deepest a tree at 7.85, a half-depth of 3.93. That is a range of nearly five
 * hundred to one, so there is no distance a fixed camera could stand at that
 * would suit both ends, and the camera is placed from the structure's own
 * half-depth instead.
 *
 * At three, the nearest point of any structure sits at two thirds of the camera
 * distance and the furthest at four thirds, so the perspective scale runs 1.5
 * near to 0.75 far, whatever size the structure is. That is the invariant the
 * suite pins, twice: the near-to-far ratio is exactly 2 at every depth, and
 * every point of every structure a child can grow projects with k inside
 * 0.6..1.8. Enough that a branch swinging toward the child visibly grows, and
 * not so much that the structure looks like it is falling on them.
 */
export const CAMERA_DISTANCE = 3;

export interface Camera {
  /** Where the viewer stands, in model units in front of the structure. */
  distance: number;
  /** Half the depth the structure occupies. Drives the haze. */
  halfDepth: number;
  /** Middle of the structure's depth, so the haze is centred on it. */
  midZ: number;
}

/**
 * Place the camera for a structure.
 *
 * Pure, and a function of the structure's measured depth alone, so the same
 * tree is framed the same way every time it is grown and nothing here has to
 * remember a previous frame.
 */
export function cameraFor(structure: {
  minZ: number;
  maxZ: number;
}): Camera {
  const halfDepth = Math.max(0.35, (structure.maxZ - structure.minZ) / 2);
  const midZ = (structure.maxZ + structure.minZ) / 2;
  return { distance: CAMERA_DISTANCE * halfDepth, halfDepth, midZ };
}

export interface Projected {
  x: number;
  y: number;
  /** Perspective scale at this point. Above 1 is nearer than the middle. */
  k: number;
  /** 0 nearest the viewer, 1 furthest away. Drives the atmospheric fade. */
  depthT: number;
}

/** How far into the haze a point at this depth sits, 0 near, 1 far. */
export function depthFade(z: number, camera: Camera): number {
  const t = (z - camera.midZ) / (2 * camera.halfDepth) + 0.5;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Weak perspective, and nothing else. There is no matrix stack and no library:
 * a point nearer the viewer is drawn bigger, which is the entire trick that
 * makes a flat canvas hold a structure with a front and a back.
 *
 * Depth is measured from the middle of the structure rather than from the seed,
 * so the framing does not lurch when a branch happens to grow backwards.
 */
export function projectPoint(x: number, y: number, z: number, camera: Camera): Projected {
  const d = camera.distance + (z - camera.midZ);
  // The floor can only be reached by a caller passing a camera that was not
  // placed for this structure. It keeps a bad call finite rather than
  // inverting the picture, which is the one failure a child would see.
  const k = camera.distance / Math.max(camera.distance * 0.2, d);
  return { x: x * k, y: y * k, k, depthT: depthFade(z, camera) };
}

// ---------------------------------------------------------------------------
// Fitting it on a screen
//
// Two numbers the renderer needs that are not renderer logic: how far ahead of
// the child the frame is fitted, and how big the mark on a growing tip is
// allowed to get. Both were found by the observed pass rather than reasoned
// out, both are the kind of formula a later edit can shift by a character
// without anything noticing, and neither of them touches a canvas. So they live
// out here with a test each, next to the rule they are fitting.
// ---------------------------------------------------------------------------

/**
 * How far ahead of the child the frame is fitted.
 *
 * The frame cannot be fitted to the structure as it stands: that scales a
 * two-inch sprout up to fill the screen, and the child's drag then appears to do
 * nothing at all, because the tree stays the same size and only gains detail.
 *
 * The first version fitted to the structure at FULL growth instead, and the
 * observed pass measured what that costs: the first split a child ever makes
 * came out 176 pixels tall on a 1943 pixel canvas, nine percent of the screen, a
 * speck above the seed. The whole activity is do-then-see, and that was barely
 * see.
 *
 * So the frame runs AHEAD of the child rather than all the way ahead. The
 * multiplier is above one so there is always sky left to grow into; the floor
 * stops that sky being the entire screen at the start, which is the case the
 * multiplier alone cannot cover, because 1.6 times nothing is still nothing.
 */
export const FRAME_LOOKAHEAD = 1.6;
export const FRAME_FLOOR = 0.35;

export function frameGrowthFor(growth: number): number {
  if (!Number.isFinite(growth)) return FRAME_FLOOR;
  return Math.min(1, Math.max(FRAME_FLOOR, growth * FRAME_LOOKAHEAD));
}

/**
 * How big the soft mark on a growing tip may get, in CSS pixels.
 *
 * Proportional to the height of what is actually standing there, not to the
 * segment the mark sits on. The observed pass caught what happens without that:
 * on a tree with one stem and its first split, the stem IS a tip, it is six
 * hundred pixels long, and a mark sized off its own length is a ninety pixel
 * blob sitting exactly on top of the split the child has just made and is at
 * that moment being told about.
 *
 * The floor is in pixels rather than proportional, because at the very start the
 * structure is a few pixels tall and two percent of it rounds to nothing; a bud
 * on a bare stem should still be a bud.
 */
export const TIP_CAP_FRACTION = 0.02;
export const TIP_CAP_MIN_PX = 2;

export function tipCapPx(structureHeightPx: number): number {
  if (!Number.isFinite(structureHeightPx)) return TIP_CAP_MIN_PX;
  return Math.max(TIP_CAP_MIN_PX, structureHeightPx * TIP_CAP_FRACTION);
}

// ---------------------------------------------------------------------------
// The palette
// ---------------------------------------------------------------------------

export interface FractalPalette {
  /** The stem, at this generation. */
  stemHue: number;
  /** The lit side of a stem. Warmer, so the light has a direction. */
  litHue: number;
  /** Behind everything. The haze the far branches fade into. */
  skyHue: number;
}

/**
 * Colour for one seed at one generation.
 *
 * The hue walks along an arc as the generations deepen, so a structure reads
 * from a dark heavy trunk out to light new growth at the tips. That is the
 * seasonal shift the brief asks for, and it is doing a second job: it makes the
 * SCALE of the repeat visible. A branch and its own small copy sit at different
 * points on the arc, so the eye can see they are the same shape at two sizes
 * even where they overlap.
 *
 * Every value folds through safeHue, so no arc anyone writes here later, at any
 * width, can land a colour in the banned band.
 */
export function paletteAt(preset: PresetId, generationT: number): FractalPalette {
  const rule = PRESETS[preset] ?? PRESETS.tree;
  const t = generationT < 0 ? 0 : generationT > 1 ? 1 : generationT;
  return {
    stemHue: safeHue((rule.hueBase + rule.hueSpan * t) / 360),
    litHue: safeHue((rule.hueBase + rule.hueSpan * t + 26) / 360),
    skyHue: safeHue((rule.hueBase - 34) / 360),
  };
}

// ---------------------------------------------------------------------------
// Saying it out loud
// ---------------------------------------------------------------------------

const SHAPE_WORDS = ['narrow', 'upright', 'open', 'wide'] as const;
const LENGTH_WORDS = ['short', 'even', 'long'] as const;

/** Which of four shapes the angle is currently making. */
export function shapeIndex(angle: number): number {
  const t = (clampAngle(angle) - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN);
  return Math.min(SHAPE_WORDS.length - 1, Math.floor(t * SHAPE_WORDS.length));
}

/** Which of three length bands the ratio is currently in. */
export function lengthIndex(ratio: number): number {
  const t = (clampRatio(ratio) - RATIO_MIN) / (RATIO_MAX - RATIO_MIN);
  return Math.min(LENGTH_WORDS.length - 1, Math.floor(t * LENGTH_WORDS.length));
}

/**
 * What is on the screen, for a child using a screen reader.
 *
 * Descriptive, never congratulatory, and never a target. It says the same thing
 * the picture says: what kind of shape, how long the branches are, and how many
 * times it has split so far.
 */
export function describeStructure(
  preset: PresetId,
  angle: number,
  ratio: number,
  generations: number,
): string {
  const rule = PRESETS[preset] ?? PRESETS.tree;
  if (generations <= 0) return 'A seed on the ground. Drag up from it to grow.';
  if (generations === 1) return `A ${rule.label.toLowerCase()} stem, not split yet.`;
  const splits = generations - 1;
  return `A ${SHAPE_WORDS[shapeIndex(angle)]} ${rule.label.toLowerCase()} with ${LENGTH_WORDS[lengthIndex(ratio)]} branches, split ${splits} ${splits === 1 ? 'time' : 'times'}.`;
}
