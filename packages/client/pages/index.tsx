import React from "react";

import { Game } from "../components/Game";
import styles from "./page.module.css";

export default class TestPage extends React.Component {
    render() {
        return (
            <div id={styles.page}>
            <Game game_host_url={process.env.game_host_url!}></Game>
            </div>
        );
    }
}
