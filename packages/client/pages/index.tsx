import React from "react";

import { withUserLoginControl } from "../components/withUserLoginControl";
import { UserBar } from "../components/UserBar";
import { Game } from "../components/Game";
import { useRecoilValue } from "recoil";
import { bgIndexState } from "../state-defs";

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
            {/* positioning for the userbar (top-left) */}
            <div className="fixed right-0 top-0" style={{ zIndex: 200 }}>
                {withUserLoginControl(UserBar)}
            </div>
            <Game></Game>
        </div>
    );
};

export default IndexPage;
