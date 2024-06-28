$(document).ready(function () {
    $('#rankings').sortable();
    $('#rankings').disableSelection();

    $.get('/get-rankings', function (data) {
        let rankings;
        try {
            rankings = JSON.parse(data);
        } catch (e) {
            rankings = data;
        }

        if (!rankings || rankings.length === 0) {
            console.log('No rankings found for the user. Loading default player list.');
            $.get('/player-data', function (playerData) {
                const players = playerData
                    .sort((a, b) => b.projected_points - a.projected_points);

                players.forEach(player => {
                    $('#rankings').append(`<li data-player-id="${player.qb_list.player_id}">${player.name}</li>`);
                });
            });
        } else {
            rankings.forEach(playerName => {
                $('#rankings').append(`<li>${playerName}</li>`);
            });
        }
    });

    $('#save-rankings').click(function () {
        const rankings = [];
        $('#rankings li').each(function () {
            rankings.push($(this).text());
        });
        $.ajax({
            url: '/save-rankings',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ rankings }),
            success: function (response) {
                alert('Rankings saved successfully');
            },
            error: function (error) {
                alert('Error saving rankings');
            }
        });
    });
});
