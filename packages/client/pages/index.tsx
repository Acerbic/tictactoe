import React from "react";
import { useRecoilState } from "recoil";

import { playerState } from "../state-defs";

import { UserBar } from "../components/UserBar";
import { Game } from "../components/Game";
import styles from "./page.module.css";

export const IndexPage: React.FC = () => {
    const playerName = "TypicalUser";

    // Redux it?
    const [player, setPlayer] = useRecoilState(playerState);
    return (
        <div id={styles.page}>
            <div className="fixed w-full flex overflow-visible justify-end">
                <UserBar
                    onLogin={() => {
                        setPlayer({
                            id: String(Math.random()),
                            name: playerName
                        });
                    }}
                    onLogout={() => {
                        setPlayer(null);
                    }}
                    username={player?.name}
                />
            </div>

            <Game game_host_url={process.env.game_host_url!}></Game>
        </div>
    );
};

export default IndexPage;
