export function Hero() {
    return (
        <div>
            <section className="max-w-[1440px] mx-auto px-container-padding py-section-gap grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center min-h-[819px]">
                <div className="flex flex-col gap-8 pr-0 lg:pr-12">
                    <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight">
                        Find a place you can call home.
                    </h1>
                    <div className="bg-surface-container-lowest border-hairline rounded-xl p-6 flex flex-col gap-4">
                        <div className="relative w-full">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                            <input className="w-full bg-transparent border-hairline rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary transition-colors font-body-md text-body-md placeholder-on-surface-variant" placeholder="Search Mohammadpur..." type="text" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-hairline rounded-lg p-3 hover-darken transition-colors cursor-pointer group">
                                <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1 group-hover:text-primary">Location</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
                                    <span className="font-body-md text-body-md">Dhaka</span>
                                </div>
                            </div>
                            <div className="border-hairline rounded-lg p-3 hover-darken transition-colors cursor-pointer group">
                                <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1 group-hover:text-primary">Price</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-on-surface-variant">payments</span>
                                    <span className="font-body-md text-body-md">৳20,000 - 30,000</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-hairline rounded-lg p-3 hover-darken transition-colors cursor-pointer group">
                                <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1 group-hover:text-primary">Bedrooms</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-on-surface-variant">bed</span>
                                    <span className="font-body-md text-body-md">3</span>
                                </div>
                            </div>
                            <button className="bg-primary text-on-primary rounded-lg flex items-center justify-center gap-2 font-label-sm text-label-sm uppercase tracking-widest hover:opacity-90 transition-opacity h-full min-h-[56px]">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
                                Search
                            </button>
                        </div>
                    </div>
                </div>
                <div className="relative h-[500px] lg:h-full w-full bg-surface-container-low border-hairline rounded-xl overflow-hidden group">
                    <img className="w-full h-full object-cover opacity-80 mix-blend-multiply" data-alt="A monochromatic, highly detailed map of a city sector with architectural precision, showing street grids and block divisions in light grays and whites. Minimalist editorial style, bright lighting." data-location="Dhaka" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtnhpW5prYMuMiGwOgKpqNlKqCh4zzA8sP5jWK1VQ0EHZrOzsW66LRTvjQsXuiTkID2dIh4bynGcHXdnyXzYWmpIzK_ubG6MOns4UxoWKezGptX_VX916EBdXqlqSYSrKN81H1i8k9GgKE32xPiZY_bxCl6Mpqjjxg51jqbWVPw6XYKLejMfNb-1mfqIoknVJnNbV80XFyRuG6iC3ShzMctwip4e-oyi9QlFsaMaVtjUIaL1QRrzho" />
                    {/* Map Markers */}
                    <div className="absolute top-[20%] left-[30%] bg-surface-container-lowest border border-primary text-primary px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm cursor-pointer hover:bg-primary hover:text-on-primary transition-colors">
                        <span>৳25k</span>
                    </div>
                    <div className="absolute top-[50%] left-[60%] bg-surface-container-lowest border border-primary text-primary px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm cursor-pointer hover:bg-primary hover:text-on-primary transition-colors">
                        <span>৳30k</span>
                    </div>
                    <div className="absolute bottom-[30%] left-[20%] bg-surface-container-lowest border border-primary text-primary px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm cursor-pointer hover:bg-primary hover:text-on-primary transition-colors">
                        <span>৳22k</span>
                    </div>
                    <button className="absolute top-4 right-4 bg-surface-container-lowest p-2 rounded-lg border-hairline hover-darken transition-colors">
                        <span className="material-symbols-outlined">layers</span>
                    </button>
                </div>
            </section>
        </div>
    );
}