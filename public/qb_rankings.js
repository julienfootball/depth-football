$(document).ready(function () {
    // Make the rankings list sortable
    $('#rankings').sortable({
        update: function(event, ui) {
            updateNumberedList();
        }
    });
    $('#rankings').disableSelection();

    // Fetch the current rankings or default player data
    $.get('/get-rankings', function (data) {
        let rankings;
        try {
            rankings = JSON.parse(data);
        } catch (e) {
            rankings = data;
        }

        if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
            console.log('No rankings found for the user. Loading default player list.');
            $.get('/player-data', function (playerData) {
                console.log('Received data from /player-data:', playerData);
                if (Array.isArray(playerData) && playerData.length > 0) {
                    populatePlayerList(playerData);
                } else {
                    console.error('Expected an array but got:', playerData);
                }
            }).fail(function() {
                console.error('Error fetching player data');
            });
        } else {
            console.log('Received data from /get-rankings:', rankings);
            populatePlayerList(rankings);
        }
    });

    // Save the rankings
    $('#save-rankings').click(function () {
        const rankings = [];
        $('#rankings li:not(.header)').each(function () {
            rankings.push({
                player_id: $(this).data('id'),
                long_name: $(this).find('.name').text(),
                team: $(this).find('.team').text(),
                pos: $(this).find('.position').text(),
                projected_points: $(this).find('.projected_points').text().split(' ')[0] // Extract the projected points part only
            });
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

    function populatePlayerList(players) {
        const ul = $('#rankings');
        const numberUl = $('#numbered-list');
        players.forEach((player, index) => {
            const li = `<li data-id="${player.player_id}">
                            <span class="name">${player.long_name}</span>
                            <span class="team">${player.team}</span>
                            <span class="opponent">${player.opponent || 'N/A'}</span>
                            <span class="position">${player.pos}</span>
                            <span class="projected_points">${player.projected_points} pts</span>
                        </li>`;
            ul.append(li);
            numberUl.append(`<li>${index + 1}</li>`);
        });
    }

    function updateNumberedList() {
        const numberUl = $('#numbered-list');
        numberUl.find('li:not(.header)').each(function (index) {
            $(this).text(index + 1);
        });
    }
});
