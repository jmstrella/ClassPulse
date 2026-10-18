import { describe, it, expect } from 'vitest';
import { computeTimelineSegments } from './ActivityTimeline';
import type { Session } from '../../lib/types';

describe('computeTimelineSegments', () => {
  const baseSession: Session = {
    id: 'sess-1',
    instructor_id: 'inst-1',
    class_name: 'Test Class',
    meet_link: null,
    class_code: 'TEST01',
    status: 'live',
    settings: {
      distracted_after_seconds: 60,
      idle_after_seconds: 180,
      offline_after_seconds: 90
    },
    started_at: new Date('2026-10-19T10:00:00Z').toISOString(),
    ended_at: null
  };

  it('scales correctly for long sessions (>60 mins, e.g. 90 minutes)', () => {
    // 90 minutes after started_at
    const now = new Date('2026-10-19T11:30:00Z');
    const participant = {
      id: 'part-1',
      joined_at: new Date('2026-10-19T10:00:00Z').toISOString(),
      last_seen_at: now.toISOString()
    };

    const heartbeats = [
      {
        id: 'hb-1',
        created_at: new Date('2026-10-19T10:15:00Z').toISOString(),
        meet_tab_open: true,
        meet_tab_focused: true,
        system_state: 'active'
      },
      {
        id: 'hb-2',
        created_at: new Date('2026-10-19T11:15:00Z').toISOString(),
        meet_tab_open: true,
        meet_tab_focused: false,
        system_state: 'active'
      }
    ];

    const result = computeTimelineSegments(heartbeats, participant, baseSession, now, 'active');

    expect(result.durationMinutes).toBe(90);
    expect(result.durationLabel).toBe('1h 30m');
    expect(result.segments).toHaveLength(30);
    // Should contain segments rather than an empty array
    expect(result.segments.every((s) => s.status)).toBe(true);
  });

  it('provides an array fallback when heartbeats is empty so bar never disappears', () => {
    const now = new Date('2026-10-19T11:30:00Z');
    const participant = {
      id: 'part-1',
      joined_at: new Date('2026-10-19T10:00:00Z').toISOString(),
      last_seen_at: now.toISOString()
    };

    const result = computeTimelineSegments([], participant, baseSession, now, 'distracted');

    expect(result.segments).toHaveLength(30);
    expect(result.segments.every((s) => s.status === 'distracted')).toBe(true);
  });

  it('marks buckets as offline if student joined later in the session', () => {
    // Session started 10:00, student joined at 10:45 (halfway through 90 min session)
    const now = new Date('2026-10-19T11:30:00Z');
    const participant = {
      id: 'part-1',
      joined_at: new Date('2026-10-19T10:45:00Z').toISOString(),
      last_seen_at: now.toISOString()
    };

    const result = computeTimelineSegments([], participant, baseSession, now, 'active');

    expect(result.segments).toHaveLength(30);
    // Early buckets (before 10:45) must be offline
    expect(result.segments[0].status).toBe('offline');
    // Later buckets must have the active fallback
    expect(result.segments[29].status).toBe('active');
  });

  it('detects offline gaps when student stops sending heartbeats', () => {
    const now = new Date('2026-10-19T10:30:00Z'); // 30 min session
    const participant = {
      id: 'part-1',
      joined_at: new Date('2026-10-19T10:00:00Z').toISOString(),
      last_seen_at: new Date('2026-10-19T10:10:00Z').toISOString()
    };

    // Only had heartbeats in first 5 minutes
    const heartbeats = [
      {
        id: 'hb-1',
        created_at: new Date('2026-10-19T10:02:00Z').toISOString(),
        meet_tab_open: true,
        meet_tab_focused: true,
        system_state: 'active'
      }
    ];

    const result = computeTimelineSegments(heartbeats, participant, baseSession, now, 'offline');

    expect(result.segments).toHaveLength(30);
    // Last buckets should be offline because gap > offline_after_seconds (90s)
    expect(result.segments[29].status).toBe('offline');
  });
});
