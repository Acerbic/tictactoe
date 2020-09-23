import React from "react";

import { UI } from "../components/UI";
import { UserBar } from "../components/UserBar";
import { useRecoilValue } from "recoil";
import { bgIndexState } from "../state-defs";

import { Game } from "../components/ttt/Game";

const bgURLs = [
    "",
    "https://media.giphy.com/media/3og0IV4YYq6QiiaTn2/giphy.gif",
    "https://media.giphy.com/media/Nly9IhTy5UnkY/giphy.gif",
    "https://media.giphy.com/media/fHrM9Iyl0KNbBYj2lg/giphy.gif",
    "https://media.giphy.com/media/26tPqm8PLiKHuUhqM/giphy.gif",
    "https://media.giphy.com/media/3ov9k1173PdfJWRsoE/giphy.gif"
];
export const IndexPage: React.FC = () => {
    const bgIndex = useRecoilValue(bgIndexState) % bgURLs.length;

    return (
        <div
            className="absolute inset-0 overflow-hidden"
            style={{
                backgroundColor: "bisque",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                backgroundImage: `url('${bgURLs[bgIndex]}')`
            }}
        >
            {/* Above-game user-related UI */}
            {/* positioning for the userbar (top-left) */}
            <div className="fixed right-0 top-0" style={{ zIndex: 200 }}>
                <UI />
            </div>

            {/* Game-specific display (lets pretend we have several different games) */}
            <div className="h-full">
                <Game />
            </div>
        </div>
    );
};

export default IndexPage;
