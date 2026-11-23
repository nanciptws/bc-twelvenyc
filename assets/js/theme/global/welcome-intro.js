const FRAME_NAMES = ['balmain', 'tote', 'magnolia', 'robe', 'drink'];

export default function welcomeIntro() {
    const intro = document.getElementById('welcome-intro');
    const windowElement = document.getElementById('welcome-intro-win');
    const skip = document.getElementById('welcome-intro-skip');

    if (!intro || !windowElement || !document.documentElement.classList.contains('welcome-intro-pending')) {
        return;
    }

    windowElement.innerHTML = FRAME_NAMES.map((name, index) => (
        `<figure class="welcome-intro-frame-${name}${index === 0 ? ' on' : ''}"></figure>`
    )).join('');

    const frames = Array.from(windowElement.querySelectorAll('figure'));
    let timers = [];
    let flip = null;

    const clearAll = () => {
        timers.forEach(clearTimeout);
        timers = [];
        clearInterval(flip);
        flip = null;
    };

    const finish = () => {
        clearAll();
        intro.classList.remove('open');
        intro.classList.add('done');

        timers.push(setTimeout(() => {
            intro.hidden = true;
            document.documentElement.classList.remove('welcome-intro-pending');
        }, 1900));
    };

    const play = () => {
        clearAll();
        intro.hidden = false;
        intro.classList.remove('done', 'open');
        document.documentElement.classList.add('welcome-intro-pending');
        frames.forEach((frame, index) => frame.classList.toggle('on', index === 0));
        void intro.offsetWidth;

        timers.push(setTimeout(() => intro.classList.add('open'), 700));
        timers.push(setTimeout(() => {
            let index = 0;

            flip = setInterval(() => {
                frames[index].classList.remove('on');
                index = (index + 1) % frames.length;
                frames[index].classList.add('on');
            }, 1100);
        }, 1750));
        timers.push(setTimeout(() => {
            clearInterval(flip);
            intro.classList.remove('open');
        }, 7200));
        timers.push(setTimeout(finish, 8250));
    };

    skip.addEventListener('click', finish);
    intro.addEventListener('click', event => {
        if (event.target === intro) finish();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !intro.hidden) finish();
    });

    window.replayWelcomeIntro = play;
    play();
}
