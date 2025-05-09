import { describe, expect, test } from 'bun:test';
import { addLevelExperience, getLevelMaxExperience } from '.';

describe('getLevelMaxExperience', () => {
  const testCases = [
    {
      description: 'should return the max experience for level 1',
      input: {
        level: 1,
        options: {
          firstLevelMaxExperience: 100,
          experienceProportionIncrease: 0.5,
        },
      },
      expected: 100,
    },
    {
      description: 'should calculate the max experience for level 2',
      input: {
        level: 2,
        options: {
          firstLevelMaxExperience: 100,
          experienceProportionIncrease: 0.5,
        },
      },
      expected: 150,
    },
    {
      description: 'should calculate the max experience for level 3',
      input: {
        level: 3,
        options: {
          firstLevelMaxExperience: 100,
          experienceProportionIncrease: 0.5,
        },
      },
      expected: 225,
    },
    {
      description: 'should calculate the max experience for level 4 with a different proportion',
      input: {
        level: 4,
        options: {
          firstLevelMaxExperience: 200,
          experienceProportionIncrease: 0.25,
        },
      },
      expected: 390.625,
    },
    {
      description: 'should return the initial experience for level 1 regardless of proportion',
      input: {
        level: 1,
        options: {
          firstLevelMaxExperience: 300,
          experienceProportionIncrease: 0.75,
        },
      },
      expected: 300,
    },
  ];

  for (const { description, input, expected } of testCases) {
    test(description, () => {
      const result = getLevelMaxExperience(input.level, input.options);
      expect(result).toBeCloseTo(expected, 5);
    });
  }
});

describe('addLevelExperience', () => {
  const testCases = [
    {
      description: 'should add 50 experience',
      input: {
        experienceToAdd: 50,
        options: {
          currentLevel: 1,
          currentExperience: 0,
          firstLevelMaxExperience: 100,
          experienceProportionIncrease: 0.5,
        },
      },
      expected: {
        level: 1,
        experience: 50,
        maxExperience: 100,
      },
    },
    {
      description: 'should add 100 experience and level up to 2',
      input: {
        experienceToAdd: 100,
        options: {
          currentLevel: 1,
          currentExperience: 0,
          firstLevelMaxExperience: 100,
          experienceProportionIncrease: 0.5,
        },
      },
      expected: {
        level: 2,
        experience: 0,
        maxExperience: 150,
      },
    },
    {
      description: 'should add 200 experience and level up to 3',
      input: {
        experienceToAdd: 200,
        options: {
          currentLevel: 2,
          currentExperience: 0,
          firstLevelMaxExperience: 100,
          experienceProportionIncrease: 0.5,
        },
      },
      expected: {
        level: 3,
        experience: 50,
        maxExperience: 225,
      },
    },
  ];

  for (const { description, input, expected } of testCases) {
    test(description, () => {
      const result = addLevelExperience(input.experienceToAdd, input.options);
      expect(result).toEqual(expected);
    });
  }
});
