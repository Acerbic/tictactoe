import "bootstrap/dist/css/bootstrap.min.css";
import React from "react";

import { Game } from "../components/Game";

// TODO: generalize
const game_host_uri = "http://localhost:3060";

export default class TestPage extends React.Component {
    render() {
        return (
            <div id="page">
                <Game game_host_uri={game_host_uri}></Game>
            </div>
        );
    }
}
