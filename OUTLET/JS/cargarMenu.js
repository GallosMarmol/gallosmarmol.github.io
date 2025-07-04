function loadMenu() {
    fetch('../HTML/menu.html')
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data);
            
            // Añade los event listeners después de cargar el menú
            document.getElementById('menuToggle').addEventListener('click', function() {
                document.getElementById('mainNav').classList.toggle('active');
            });
            
            document.querySelectorAll('#mainNav a').forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 1024) {
                        document.getElementById('mainNav').classList.remove('active');
                    }
                });
                
                // Marcar página activa
                const currentPage = location.pathname.split('/').pop();
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');
                }
            });
            
            window.addEventListener('resize', function() {
                if (window.innerWidth > 768) {
                    document.getElementById('mainNav').classList.remove('active');
                }
            });
        })
        .catch(error => console.error('Error loading menu:', error));
}

document.addEventListener('DOMContentLoaded', loadMenu);