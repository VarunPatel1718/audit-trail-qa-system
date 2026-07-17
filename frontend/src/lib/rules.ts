export function ruleLabel(ruleName: string): string {
  return ruleName
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}
