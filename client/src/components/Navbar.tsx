export function Navbar() {
    return (
        <div>
            <header className="bg-surface dark:bg-surface w-full h-20 border-b border-outline-variant dark:border-outline flat no shadows sticky top-0 z-50">
                <div className="flex justify-between items-center px-container-padding max-w-[1440px] mx-auto w-full h-full">
                    <a className="flex items-center gap-2 text-headline-md font-headline-md font-bold text-primary dark:text-on-primary-fixed" href="#">
                        <span className="material-symbols-outlined" data-icon="real_estate_agent" style={{ fontVariationSettings: "'FILL' 0;" }}>real_estate_agent</span>
                        Nibash
                    </a>
                    <nav className="hidden md:flex gap-8">
                        <a className="text-primary dark:text-on-primary-fixed border-b-2 border-primary dark:border-on-primary-fixed pb-1 font-label-sm text-label-sm uppercase tracking-widest scale-98 active:scale-95 transition-transform duration-200" href="#">Find a Home</a>
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed transition-colors font-label-sm text-label-sm uppercase tracking-widest scale-98 active:scale-95 transition-transform duration-200" href="#">List a Property</a>
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed transition-colors font-label-sm text-label-sm uppercase tracking-widest scale-98 active:scale-95 transition-transform duration-200" href="#">About</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <button className="hidden md:block font-label-sm text-label-sm uppercase text-primary border-b border-primary hover:border-b-2 transition-all">Log in</button>
                        <button className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-sm text-label-sm uppercase tracking-widest hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-all scale-98 active:scale-95 hover:text-primary">Get Started</button>
                    </div>
                </div>
            </header>
            <main className="flex-grow" />
        </div>
    );
}