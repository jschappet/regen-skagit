/* const toggle = document.getElementById('theme-toggle');
const sun = document.getElementById('sun-icon');
const moon = document.getElementById('moon-icon');


function applyTheme(isDark) {
  console.log('Applying theme:', isDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', isDark);

  if (isDark) {
    sun.classList.remove('hidden');
    sun.classList.add('inline');
    moon.classList.remove('inline');
    moon.classList.add('hidden');
  } else {
    sun.classList.remove('inline');
    sun.classList.add('hidden');
    moon.classList.remove('hidden');
    moon.classList.add('inline');
  }
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Initialize theme from saved preference or system
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  applyTheme(savedTheme === 'dark');
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark);
}

// Toggle button click
toggle.addEventListener('click', () => {
  const isDark = !document.documentElement.classList.contains('dark');
  applyTheme(isDark);
});
 */