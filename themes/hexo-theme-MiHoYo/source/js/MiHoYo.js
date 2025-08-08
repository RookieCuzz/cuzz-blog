// MiHoYo Theme JavaScript
console.log('MiHoYo Theme loaded successfully!');

// 添加一些基本的交互功能
document.addEventListener('DOMContentLoaded', function() {
    // 平滑滚动到顶部
    const gotoTop = document.querySelector('.goto-top');
    if (gotoTop) {
        gotoTop.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // 导航菜单高亮
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-list a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});
