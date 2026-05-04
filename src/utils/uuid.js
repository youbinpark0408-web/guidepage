export const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
