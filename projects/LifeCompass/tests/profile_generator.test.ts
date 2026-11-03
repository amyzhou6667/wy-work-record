import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateSkillProfile } from '../src/services/profile.ts';
import type { SkillTag } from '../src/types/index.ts';

describe('Profile Generator', () => {
  test('should generate full profile with radar scores and recommended tracks', () => {
    const mockSkills: SkillTag[] = [
      {
        id: 's1',
        name: '小红书文案与内容策划',
        category: 'hard',
        proficiencyLevel: 4,
        evidence: '曾撰写多篇爆款文案转化过数千销售',
        monetizationScore: 85
      },
      {
        id: 's2',
        name: '共情倾听与同理心沟通',
        category: 'soft',
        proficiencyLevel: 4,
        evidence: '朋友经常找我诉苦和倾诉',
        monetizationScore: 70
      }
    ];

    const profile = generateSkillProfile({
      userId: 'user_100',
      skills: mockSkills,
      weeklyHours: 12,
      riskTolerance: 'balanced',
      domain: '电商内容营销'
    });

    assert.strictEqual(profile.userId, 'user_100');
    assert.ok(profile.summary);
    assert.ok(profile.radarScores.hardCompetence >= 60);
    assert.ok(profile.radarScores.businessAcumen >= 60);
    assert.strictEqual(profile.recommendedTracks.length, 3);
    assert.ok(profile.recommendedTracks[0].matchScore >= 80);
  });
});
