import { getSkillTree, isSkillUnlocked, getSkillsByTier, getMasterSkillChain } from '../src/game-logic';
import { SkillTreeSkill } from '../src/game-logic/skills';

describe('Skill System', () => {
  const skillTree = getSkillTree();

  describe('getSkillTree', () => {
    test('returns a valid skill tree structure', () => {
      expect(skillTree).toHaveProperty('tiers');
      expect(skillTree).toHaveProperty('skills');
      expect(skillTree.tiers).toHaveProperty('trained');
      expect(skillTree.tiers).toHaveProperty('expert');
      expect(skillTree.tiers).toHaveProperty('master');
    });

    test('tier bonuses are correct', () => {
      expect(skillTree.tiers.trained.bonus).toBe(10);
      expect(skillTree.tiers.expert.bonus).toBe(15);
      expect(skillTree.tiers.master.bonus).toBe(20);
    });

    test('trained skills have no prerequisites', () => {
      const trainedSkills: SkillTreeSkill[] = skillTree.skills.filter((s: any) => s.tier === 'trained') as SkillTreeSkill[];
      trainedSkills.forEach((skill: SkillTreeSkill) => {
        expect(skill.unlocked_by).toBeUndefined();
      });
    });

    test('expert skills have prerequisites', () => {
      const expertSkills: SkillTreeSkill[] = skillTree.skills.filter((s: any) => s.tier === 'expert') as SkillTreeSkill[];
      expertSkills.forEach((skill: SkillTreeSkill) => {
        expect(skill.unlocked_by).toBeDefined();
        expect(Array.isArray(skill.unlocked_by)).toBe(true);
        expect(skill.unlocked_by!.length).toBeGreaterThan(0);
      });
    });

    test('master skills have prerequisites', () => {
      const masterSkills: SkillTreeSkill[] = skillTree.skills.filter((s: any) => s.tier === 'master') as SkillTreeSkill[];
      masterSkills.forEach((skill: SkillTreeSkill) => {
        expect(skill.unlocked_by).toBeDefined();
        expect(Array.isArray(skill.unlocked_by)).toBe(true);
        expect(skill.unlocked_by!.length).toBeGreaterThan(0);
      });
    });

    test('trained skills have unlock targets', () => {
      const trainedSkills: SkillTreeSkill[] = skillTree.skills.filter((s: any) => s.tier === 'trained') as SkillTreeSkill[];
      trainedSkills.forEach((skill: SkillTreeSkill) => {
        expect(skill.unlocks).toBeDefined();
        expect(Array.isArray(skill.unlocks)).toBe(true);
        expect(skill.unlocks!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isSkillUnlocked', () => {
    test('trained skills are always unlocked', () => {
      const trainedSkills: SkillTreeSkill[] = skillTree.skills.filter((s: any) => s.tier === 'trained') as SkillTreeSkill[];
      trainedSkills.forEach((skill: SkillTreeSkill) => {
        expect(isSkillUnlocked(skill.id, [], skillTree)).toBe(true);
      });
    });

    test('unlocked_by skills need at least one prerequisite', () => {
      // psychology requires linguistics OR zoology
      expect(isSkillUnlocked('psychology', ['linguistics'], skillTree)).toBe(true);
      expect(isSkillUnlocked('psychology', ['zoology'], skillTree)).toBe(true);
      expect(isSkillUnlocked('psychology', ['computers'], skillTree)).toBe(false);
      expect(isSkillUnlocked('psychology', [], skillTree)).toBe(false);
    });

    test('expert skill with multiple prerequisites needs any one', () => {
      // mysticism requires art, archaeology, or theology
      expect(isSkillUnlocked('mysticism', ['art'], skillTree)).toBe(true);
      expect(isSkillUnlocked('mysticism', ['archaeology'], skillTree)).toBe(true);
      expect(isSkillUnlocked('mysticism', ['theology'], skillTree)).toBe(true);
      expect(isSkillUnlocked('mysticism', ['computers'], skillTree)).toBe(false);
    });

    test('master skill needs at least one expert prerequisite', () => {
      // sophontology requires psychology
      expect(isSkillUnlocked('sophontology', ['psychology'], skillTree)).toBe(true);
      expect(isSkillUnlocked('sophontology', ['computers'], skillTree)).toBe(false);
    });

    test('non-existent skill returns false', () => {
      expect(isSkillUnlocked('nonexistent_skill', [], skillTree)).toBe(false);
    });
  });

  describe('getSkillsByTier', () => {
    test('groups skills by tier correctly', () => {
      const result = getSkillsByTier(
        ['military_training', 'firearms', 'command'],
        skillTree
      );

      expect(result.trained.length).toBe(1);
      expect(result.trained[0].id).toBe('military_training');

      expect(result.expert.length).toBe(1);
      expect(result.expert[0].id).toBe('firearms');

      expect(result.master.length).toBe(1);
      expect(result.master[0].id).toBe('command');
    });

    test('empty input returns empty arrays', () => {
      const result = getSkillsByTier([], skillTree);
      expect(result.trained).toEqual([]);
      expect(result.expert).toEqual([]);
      expect(result.master).toEqual([]);
    });

    test('handles duplicate skills gracefully', () => {
      const result = getSkillsByTier(['athletics', 'athletics'], skillTree);
      expect(result.trained.length).toBe(2); // duplicates are preserved
    });

    test('ignores non-existent skills', () => {
      const result = getSkillsByTier(['nonexistent'], skillTree);
      expect(result.trained).toEqual([]);
      expect(result.expert).toEqual([]);
      expect(result.master).toEqual([]);
    });
  });

  describe('getMasterSkillChain', () => {
    test('returns a valid chain for command', () => {
      const chain = getMasterSkillChain('command', skillTree);
      expect(chain).not.toBeNull();
      expect(chain!.master.id).toBe('command');
      expect(chain!.master.tier).toBe('master');
      expect(chain!.expert.tier).toBe('expert');
      expect(chain!.trained.tier).toBe('trained');
    });

    test('returns a valid chain for hyperspace', () => {
      const chain = getMasterSkillChain('hyperspace', skillTree);
      expect(chain).not.toBeNull();
      expect(chain!.master.id).toBe('hyperspace');
    });

    test('returns a valid chain for artificial_intelligence', () => {
      const chain = getMasterSkillChain('artificial_intelligence', skillTree);
      expect(chain).not.toBeNull();
      expect(chain!.master.id).toBe('artificial_intelligence');
    });

    test('returns null for non-existent skill', () => {
      const chain = getMasterSkillChain('nonexistent', skillTree);
      expect(chain).toBeNull();
    });

    test('returns null for non-master skill', () => {
      const chain = getMasterSkillChain('computers', skillTree);
      expect(chain).toBeNull();
    });
  });
});
