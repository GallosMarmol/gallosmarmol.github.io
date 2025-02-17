        // Animación de scroll suave al hacer clic en "scroll-down"
        document.querySelector('.scroll-down').addEventListener('click', () => {
            document.querySelector('.categories').scrollIntoView({ behavior: 'smooth' });
        });

        // Efecto de aparición al hacer scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.category-card').forEach(card => {
            observer.observe(card);
        });