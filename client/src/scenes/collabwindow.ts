import { Window } from "./window";
import { game } from '../api/game';

export class CollabWindow extends Window {
    private submitText;
    private acceptText;

    private hasAccepted = false;

    private gameinstance: game;

    public constructor(key: string, gameinstance: game, windowData = { x: 500, y: 400, width: 300, height: 100 }) {
        super(key, windowData);
        this.gameinstance = gameinstance
    }

    protected initialize() {

        var bg = this.add.image(0, 0, 'scrollbg').setOrigin(0.5)
        this.add.text(20, 20, 'Collaboration bitches', { backgroundColor: 'fx00' })

        // submit decision
        this.submitText = this.add.text(20, 70, 'Submit decision', { backgroundColor: 'fx00' })
        this.submitText.setInteractive()
        var self = this
        this.submitText.on('pointerdown', function (pointer) {
            // that.gameinstance.dropGold(1, function () {

            // })
        });
        // accept decision
        this.acceptText = this.add.text(200, 70, 'Accept decision', { backgroundColor: 'fx00' })
        this.acceptText.setInteractive()
        this.acceptText.on('pointerdown', function (pointer) {
            if (this.hasAccepted) {
                console.log("You have already accepted this decision");
                return;
            }
            self.gameinstance.collabDecisionAccept();
        });

        //This drag is pretty f'd up.
        bg.on('drag', function (pointer, dragX, dragY) {
            if (dragX < this.scene.parent.x - 10 && dragY < this.scene.parent.y - 10) {
                this.scene.parent.x = this.scene.parent.x - 10;
                this.scene.parent.y = this.scene.parent.y - 10;
                this.scene.refresh()
            }
            else {
                this.scene.parent.x = dragX;
                this.scene.parent.y = dragY;
                this.scene.refresh()
            }
        });

        function setAccepted(numAccepted) {
            self.hasAccepted = true;
            console.log("Callback: successfully accepted decision, numAccepted: ", numAccepted)
        }
        // Callbacks
        this.gameinstance.receiveDecisionAccepted(setAccepted);
    }
}