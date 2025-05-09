export type GetLevelMaxExperienceOptions = {
  firstLevelMaxExperience: number; // опыт, который нужен для получения 2-го уровня
  experienceProportionIncrease: number; // пропорция увеличения опыта относительно предыдущего уровня для получения следующего уровня
};

export function getLevelMaxExperience(level: number, options: GetLevelMaxExperienceOptions) {
  const { firstLevelMaxExperience, experienceProportionIncrease } = options;

  return firstLevelMaxExperience * (1 + experienceProportionIncrease) ** (level - 1);
}

export type AddLevelExperienceOptions = {
  currentLevel: number;
  currentExperience: number;

  firstLevelMaxExperience: number;
  experienceProportionIncrease: number;
};

export function addLevelExperience(experience: number, options: AddLevelExperienceOptions) {
  let { currentLevel, currentExperience, experienceProportionIncrease } = options;
  let maxExperience = getLevelMaxExperience(currentLevel, options);

  currentExperience += experience;

  while (currentExperience >= maxExperience) {
    currentExperience -= maxExperience;
    currentLevel++;
    maxExperience += maxExperience * experienceProportionIncrease;
  }

  return {
    level: currentLevel,
    experience: currentExperience,
    maxExperience,
  };
}
