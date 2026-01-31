// 9 Post-it note style colours
export const NOTE_COLORS = [
  { name: 'White', value: '#FFFFFF', dark: '#1f2937' },       // Dark Gray
  { name: 'Yellow', value: '#FFF9C4', dark: '#424019' },      // Dark Yellow
  { name: 'Pink', value: '#FFE0E0', dark: '#4a1919' },        // Dark Pink
  { name: 'Blue', value: '#D1E7FF', dark: '#1e3a5f' },       // Dark Blue
  { name: 'Green', value: '#D4EDDA', dark: '#1f4626' },      // Dark Green
  { name: 'Orange', value: '#FFE5CC', dark: '#4d2d15' },     // Dark Orange
  { name: 'Purple', value: '#E8DAEF', dark: '#37263c' },     // Dark Purple
  { name: 'Mint', value: '#D5F5E3', dark: '#264030' },       // Dark Mint
  { name: 'Peach', value: '#FADBD8', dark: '#5c3633' },      // Dark Peach
];

export const DEFAULT_NOTE_COLOR = '#FFFFFF';

export function getNoteColor(value: string, isDark: boolean): string {
  const colorObj = NOTE_COLORS.find(c => c.value.toUpperCase() === value.toUpperCase());
  if (isDark) {
    return colorObj?.dark || '#1f2937';
  }
  return colorObj?.value || '#FFFFFF';
}
