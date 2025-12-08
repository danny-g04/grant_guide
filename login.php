<?php
    session_start();
?>
<!DOCTYPE html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="proStyle.css">
</head>

<body class="menu-bg">
    <header class="header">
        <a href="#" class="logo">D & D Foods</a>
        <nav class="navbar">
            <a href="index.php">Menu</a>
            <a href="checkout.php">Checkout</a>
            <a href="history.php">History</a>
            <a href="login.php" class="active">Login</a>
        </nav>
    </header>
</body>

 
<body>
    <div class="container">
        <?php

            if (isset($_SESSION['r_success']) && $_SESSION['r_success'] == true){
             echo "<div class='alert alert-success'> Registered Successfully </div>";
             $_SESSION['r_success']= false;
            }

            if (isset($_SESSION['LogIn']) && $_SESSION['LogIn'] == false){
                echo "<div class='alert alert-danger'> Log in first to place an order </div>";
                $_SESSION['LogIn']= true;  
            }

            require_once "server.php";

            if (isset($_POST["Login"])) {
                $email = trim($_POST["email"]);
                $password = trim($_POST["password"]);

                $sql = "SELECT * FROM Person WHERE email = '$email'";
                $result = mysqli_query($conn, $sql);
                $user = mysqli_fetch_array($result, MYSQLI_ASSOC);

                if ($user) {
                    if (password_verify($password, $user["password"])) {
                        $_SESSION['username'] = $user["person_name"];
                        $_SESSION['id'] = $user["person_id"];
                        header("Location: index.php");
                        exit(); 
                    } else {
                        echo "<div class='alert alert-danger'>Wrong Password</div>";
                    }
                } else {
                    echo "<div class='alert alert-danger'>Email does not exist</div>";
                }
            }
            ?>

        <form action="login.php" method="post">
            <div class="form-group">
                <input type="email" placeholder="Enter Email:" name="email" class="form-control">
            </div>
            <div class="form-group">
                <input type="password" placeholder="Enter Password:" name="password" class="form-control">
            </div>
            <div class="form-group">
                <input type="submit" value="Login" name="Login" class="btn btn-primary">
            </div>
        </form>
        <p>Not Registered? <a href="register_up.php"> Register here </p>
    </div>
</body>